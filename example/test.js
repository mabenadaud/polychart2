examples = {
  'point' : function(dom) {
    function one() { return Math.random() * 10 }
    function obj() { return {x: one(), y: one(), c: one()} }
    function construct() {
      var i, data = [];
      for (i = 0; i < 10; i++) {
        data.push(obj())
      }
      return data
    }
    var spec = function() {
      var jsondata = construct()
      var data = new poly.Data({ json: jsondata });
      var sampleLayer = {
        data: data, type: 'point', x: 'x', y: 'y'
      };
      if (Math.random() < 0.5) {
        sampleLayer.color = 'c'
      }
      if (Math.random() < 0.5) {
        sampleLayer.size = 'x'
      }
      if (Math.random() < 0.4) {
        sampleLayer.size = 'c'
      }
      return {
        data : jsondata,
        spec : {
          layers: [sampleLayer],
        }
      };
    }
    var initspec = spec().spec
    var c = poly.chart(initspec)
    c.render('hello')

    function redraw() {
      var newspec = spec()
      initspec.layers[0].data.update(newspec.data)
      c.make(newspec.spec)
      c.render()
      setTimeout(redraw, 1000);
    }
    setTimeout(redraw, 1000)

  },
  'point2' : function(dom) {
    var jsondata = [{x:'A',y:2},{x:'B',y:3},{x:'C',y:1}]
    var data = new poly.Data({ json: jsondata });
    var sampleLayer = {
      data: data,
      type: 'point',
      x: 'x',
      y: 'y',
      size: {'const': 10},
      color: 'x'
    };
    var spec =  { layers: [sampleLayer] }
    var c = poly.chart(spec)
    c.render(dom)
  },
  'point3' : function(dom) {
    var jsondata = [{x:'A',y:'X'},{x:'B',y:'Y'},{x:'C',y:'Z'}]
    var data = new poly.Data({ json: jsondata });
    var sampleLayer = { data: data, type: 'point', x: 'x', y: 'y', color: {const:'#E01B6A'} };
    var spec =  { layers: [sampleLayer] }
    var c = poly.chart(spec)
    c.render(dom)
  }
}
