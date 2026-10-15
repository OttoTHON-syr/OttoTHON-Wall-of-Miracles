/* Photo focus picker for the editor (Decap CMS custom widget "focusimage").
 *
 * It looks like the normal photo field. After a photo is chosen, a draggable box appears on top of it.
 * Drag the box over the part of the photo that should stay in view when the photo is cropped.
 *
 * How it is saved: the value stays one piece of text, the photo path with a short suffix, for example
 *     assets/uploads/abi.jpg#focus=45,25
 * (45 = how far across, 25 = how far down, in percent). The website reads the suffix and crops to match.
 * If this file ever fails to load, the editor falls back to the plain photo picker.
 * No libraries: it only uses `h` and `createClass`, which Decap CMS provides.
 */
(function () {
  'use strict';
  var CMS = window.CMS, h = window.h, createClass = window.createClass;
  if (!CMS || !h || !createClass) { if (window.console) console.warn('focusimage: the editor is not ready, skipping'); return; }

  var DEFAULT_X = 50, DEFAULT_Y = 25;
  var clamp = function (v) { return Math.max(0, Math.min(100, v)); };
  var assign = function (a) { for (var i = 1; i < arguments.length; i++) for (var k in arguments[i]) if (Object.prototype.hasOwnProperty.call(arguments[i], k)) a[k] = arguments[i][k]; return a; };
  var FRAMES = [['Square', 1], ['Portrait', 0.8], ['Landscape', 4 / 3]];
  var FRAME_FROM_SETTING = {square: 1, portrait: 0.8, landscape: 4 / 3};

  // "assets/x.jpg#focus=45,25" -> {src, x, y}
  function splitValue(v) {
    var s = v == null ? '' : String(v), i = s.indexOf('#');
    var src = i < 0 ? s : s.slice(0, i), frag = i < 0 ? '' : s.slice(i + 1);
    var m = /(?:^|&)focus=(\d{1,3}(?:\.\d+)?),(\d{1,3}(?:\.\d+)?)/.exec(frag);
    return {src: src, x: m ? clamp(+m[1]) : null, y: m ? clamp(+m[2]) : null};
  }
  function joinValue(src, x, y) { return src + '#focus=' + Math.round(x) + ',' + Math.round(y); }
  function imageWidget() { try { return CMS.getWidget('image') || {}; } catch (e) { return {}; } }

  var Control = createClass({
    getInitialState: function () { return {disp: null, live: null, ratio: 1, broken: false, open: false}; },

    componentDidMount: function () {
      var self = this;
      this.onResize = function () { self.measure(); };
      window.addEventListener('resize', this.onResize);
      // start with the frame shape chosen under Appearance, if it can be read
      try {
        fetch('../content/settings.json', {cache: 'no-cache'}).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
          var r = s && s.theme && FRAME_FROM_SETTING[s.theme.photoFrame];
          if (r && !self.unmounted) self.setState({ratio: r}, function () { self.measure(); });
        }).catch(function () {});
      } catch (e) {}
    },
    componentWillUnmount: function () { this.unmounted = true; window.removeEventListener('resize', this.onResize); },

    current: function () {
      var p = splitValue(this.props.value), live = this.state.live;
      return {src: p.src, x: live ? live.x : (p.x == null ? DEFAULT_X : p.x), y: live ? live.y : (p.y == null ? DEFAULT_Y : p.y), set: p.x != null};
    },
    measure: function () {
      if (this.unmounted || !this.imgEl) return;
      var w = this.imgEl.clientWidth, hh = this.imgEl.clientHeight;
      if (w && hh && (!this.state.disp || this.state.disp.w !== w || this.state.disp.h !== hh)) this.setState({disp: {w: w, h: hh}});
    },
    onImgLoad: function () { this.setState({broken: false}); this.measure(); },
    onImgError: function () { this.setState({broken: true}); },

    // a new photo chosen with the normal picker: start fresh (no focus saved)
    onPhoto: function (next) {
      var n = next == null ? '' : String(next);
      if (n === this.current().src) return;           // same photo: keep the focus
      this.setState({live: null, disp: null, broken: false, open: !!n});
      this.props.onChange(n);
    },
    commit: function (x, y) {
      var src = this.current().src;
      if (!src) return;
      this.setState({live: null});
      this.props.onChange(joinValue(src, x, y));
    },
    reset: function () { this.setState({live: null}); this.props.onChange(this.current().src); },

    // the box: it covers the part of the photo that will be visible in the chosen frame shape
    geometry: function () {
      var d = this.state.disp; if (!d) return null;
      var ratio = this.state.ratio, bw, bh;
      if (d.w / d.h > ratio) { bh = d.h; bw = bh * ratio; } else { bw = d.w; bh = bw / ratio; }
      return {dw: d.w, dh: d.h, bw: bw, bh: bh, mx: d.w - bw, my: d.h - bh};
    },
    fromPointer: function (e, offX, offY) {
      var g = this.geometry(), c = this.current(); if (!g || !this.wrapEl) return null;
      var r = this.wrapEl.getBoundingClientRect(), left = e.clientX - r.left - offX, top = e.clientY - r.top - offY;
      return {x: g.mx > 1 ? clamp(left / g.mx * 100) : c.x, y: g.my > 1 ? clamp(top / g.my * 100) : c.y};
    },
    onBoxDown: function (e) {
      var r = e.currentTarget.getBoundingClientRect();
      this.drag = {dx: e.clientX - r.left, dy: e.clientY - r.top};
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault(); e.stopPropagation();
    },
    onBoxMove: function (e) {
      if (!this.drag) return;
      var p = this.fromPointer(e, this.drag.dx, this.drag.dy);
      if (p) this.setState({live: p});
    },
    onBoxUp: function () {
      if (!this.drag) return;
      this.drag = null;
      var c = this.current(); this.commit(c.x, c.y);
    },
    onWrapDown: function (e) {                                  // click the photo: centre the box there
      var g = this.geometry(); if (!g) return;
      var p = this.fromPointer(e, g.bw / 2, g.bh / 2);
      if (p) this.commit(p.x, p.y);
    },
    onKey: function (e) {
      var c = this.current(), step = e.shiftKey ? 5 : 1, x = c.x, y = c.y, k = e.key;
      if (k === 'ArrowLeft') x -= step; else if (k === 'ArrowRight') x += step; else if (k === 'ArrowUp') y -= step; else if (k === 'ArrowDown') y += step; else return;
      e.preventDefault(); this.commit(clamp(x), clamp(y));
    },

    imageUrl: function (src) {
      var a = '';
      try { if (this.props.getAsset) { var r = this.props.getAsset(src, this.props.field); a = r ? String(r) : ''; } } catch (e) {}
      if (/^(blob:|data:|https?:)/.test(a)) return a;           // a photo picked in this session, or hosted elsewhere
      try { return new URL('../' + src.replace(/^\/+/, ''), window.location.href).href; } catch (e) { return ''; }
    },

    render: function () {
      var self = this, c = this.current(), props = this.props, Picker = imageWidget().control;
      var picker = Picker ? h(Picker, assign({}, props, {value: c.src, onChange: this.onPhoto})) : h('p', null, 'The photo picker is not available.');
      if (!c.src) return h('div', null, picker);

      var g = this.geometry(), st = this.state;
      var box = g && !st.broken ? h('div', {
        tabIndex: 0, role: 'application', 'aria-label': 'Focus box. Drag it, or use the arrow keys.',
        onPointerDown: this.onBoxDown, onPointerMove: this.onBoxMove, onPointerUp: this.onBoxUp, onPointerCancel: this.onBoxUp, onKeyDown: this.onKey,
        style: {position: 'absolute', boxSizing: 'border-box', width: g.bw + 'px', height: g.bh + 'px', left: (g.mx * c.x / 100) + 'px', top: (g.my * c.y / 100) + 'px',
          border: '3px solid #fff', outline: '2px solid #15BDEE', boxShadow: '0 0 0 9999px rgba(10,20,40,.55)', cursor: 'grab', touchAction: 'none', borderRadius: '2px'}
      }) : null;
      var tip = g && g.mx <= 1 && g.my <= 1 ? 'This photo already fits this frame, so there is nothing to move.' :
        g && g.mx <= 1 ? 'In this frame the photo is only trimmed at the top and bottom, so the box moves up and down.' :
        g && g.my <= 1 ? 'In this frame the photo is only trimmed at the sides, so the box moves left and right.' : '';

      var btn = {padding: '4px 12px', borderRadius: '999px', border: '2px solid #28456A', background: 'transparent', color: '#28456A', cursor: 'pointer', font: 'inherit', fontSize: '13px'};
      if (!st.open) {
        // closed: no big photo is loaded, so lists with many people stay fast
        return h('div', null, picker,
          h('div', {style: {marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}},
            h('button', {type: 'button', 'aria-expanded': false, onClick: function () { self.setState({open: true}); }, style: btn}, c.set ? 'Change photo focus' : 'Set photo focus'),
            h('span', {style: {fontSize: '13px', opacity: 0.75}}, c.set ? 'Focus is set.' : 'Using the middle of the photo.')));
      }

      return h('div', null, picker,
        h('div', {style: {marginTop: '14px'}},
          h('p', {style: {margin: '0 0 8px', fontWeight: 600}}, 'Drag the box over the part of the photo that should always stay in view'),
          h('div', {style: {display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px'}},
            h('span', {style: {fontSize: '13px'}}, 'Frame shape:'),
            FRAMES.map(function (f) {
              var on = Math.abs(st.ratio - f[1]) < 0.001;
              return h('button', {key: f[0], type: 'button', 'aria-pressed': on, onClick: function () { self.setState({ratio: f[1]}); },
                style: assign({}, btn, {background: on ? '#28456A' : 'transparent', color: on ? '#fff' : '#28456A'})}, f[0]);
            }),
            c.set ? h('button', {type: 'button', onClick: this.reset, style: assign({}, btn, {border: '2px solid #888', color: 'inherit'})}, 'Reset to the middle') : null,
            h('button', {type: 'button', onClick: function () { self.setState({open: false, disp: null, broken: false}); }, style: assign({}, btn, {border: '2px solid #888', color: 'inherit'})}, 'Done')),
          st.broken
            ? h('p', {style: {margin: '8px 0', padding: '8px 12px', background: '#fff3cd', borderRadius: '6px', fontSize: '13px'}}, 'The photo preview is not available yet. Save or publish the photo once, then come back to place the box.')
            : h('div', {ref: function (el) { self.wrapEl = el; }, onPointerDown: this.onWrapDown,
                style: {position: 'relative', display: 'inline-block', maxWidth: '100%', lineHeight: 0, overflow: 'hidden', borderRadius: '6px', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none'}},
              h('img', {ref: function (el) { self.imgEl = el; }, src: this.imageUrl(c.src), alt: 'The photo', onLoad: this.onImgLoad, onError: this.onImgError, draggable: false, decoding: 'async',
                style: {display: 'block', maxWidth: '100%', maxHeight: '380px', height: 'auto', width: 'auto'}}),
              box),
          tip ? h('p', {style: {margin: '8px 0 0', fontSize: '13px', opacity: 0.8}}, tip) : null));
    }
  });

  var Preview = createClass({
    render: function () {
      var p = splitValue(this.props.value), Img = imageWidget().preview;
      return Img ? h(Img, assign({}, this.props, {value: p.src})) : h('span', null, p.src);
    }
  });

  try {
    CMS.registerWidget('focusimage', Control, Preview);
  } catch (e) {
    if (window.console) console.error('focusimage: could not register, using the plain photo picker', e);
    try { var img = imageWidget(); CMS.registerWidget('focusimage', img.control, img.preview); } catch (e2) {}
  }
})();
