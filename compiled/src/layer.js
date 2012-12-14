(function() {
  var Area, Bar, Box, Layer, Line, Path, Point, Text, Tile, aesthetics, defaults, poly, sf,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  poly = this.poly || {};

  aesthetics = poly["const"].aes;

  sf = poly["const"].scaleFns;

  defaults = {
    'x': sf.novalue(),
    'y': sf.novalue(),
    'color': 'steelblue',
    'size': 2,
    'opacity': 0.9,
    'shape': 1
  };

  poly.layer = {};

  /*
  Turns a 'non-strict' layer spec to a strict one. Specifically, the function
  (1) wraps aes mapping defined by a string in an object: "col" -> {var: "col"}
  (2) puts all the level/min/max filtering into the "filter" group
  See the layer spec definition for more information.
  */

  poly.layer.toStrictMode = function(spec) {
    var aes, _i, _len;
    for (_i = 0, _len = aesthetics.length; _i < _len; _i++) {
      aes = aesthetics[_i];
      if (spec[aes] && _.isString(spec[aes])) {
        spec[aes] = {
          "var": spec[aes]
        };
      }
    }
    return spec;
  };

  /*
  Public interface to making different layer types.
  */

  poly.layer.make = function(layerSpec, strictmode) {
    switch (layerSpec.type) {
      case 'point':
        return new Point(layerSpec, strictmode);
      case 'text':
        return new Text(layerSpec, strictmode);
      case 'line':
        return new Line(layerSpec, strictmode);
      case 'path':
        return new Path(layerSpec, strictmode);
      case 'area':
        return new Area(layerSpec, strictmode);
      case 'bar':
        return new Bar(layerSpec, strictmode);
      case 'tile':
        return new Tile(layerSpec, strictmode);
      case 'box':
        return new Box(layerSpec, strictmode);
    }
  };

  /*
  Base class for all layers
  */

  Layer = (function() {

    Layer.prototype.defaults = _.extend(defaults, {
      'size': 7
    });

    function Layer(layerSpec, strict) {
      this._makeMappings = __bind(this._makeMappings, this);
      this.render = __bind(this.render, this);
      this.reset = __bind(this.reset, this);      this.initialSpec = poly.layer.toStrictMode(layerSpec);
      this.prevSpec = null;
      this.dataprocess = new poly.DataProcess(this.initialSpec, strict);
      this.pts = {};
    }

    Layer.prototype.reset = function() {
      return this.make(this.initialSpec);
    };

    Layer.prototype.make = function(layerSpec, callback) {
      var spec,
        _this = this;
      spec = poly.layer.toStrictMode(layerSpec);
      this._makeMappings(spec);
      this.dataprocess.make(spec, function(statData, metaData) {
        _this.statData = statData;
        _this.meta = metaData;
        if (!(_this.statData != null)) {
          throw poly.error.data("No data is passed into the layer");
        }
        _this._calcGeoms();
        return callback();
      });
      return this.prevSpec = spec;
    };

    Layer.prototype._calcGeoms = function() {
      return this.geoms = {};
    };

    Layer.prototype.getMeta = function(key) {
      if (this.mapping[key]) {
        return this.meta[this.mapping[key]];
      } else {
        return {};
      }
    };

    Layer.prototype.render = function(render) {
      var added, deleted, id, kept, newpts, _i, _j, _k, _len, _len2, _len3, _ref;
      newpts = {};
      _ref = poly.compare(_.keys(this.pts), _.keys(this.geoms)), deleted = _ref.deleted, kept = _ref.kept, added = _ref.added;
      for (_i = 0, _len = deleted.length; _i < _len; _i++) {
        id = deleted[_i];
        this._delete(render, this.pts[id]);
      }
      for (_j = 0, _len2 = added.length; _j < _len2; _j++) {
        id = added[_j];
        newpts[id] = this._add(render, this.geoms[id]);
      }
      for (_k = 0, _len3 = kept.length; _k < _len3; _k++) {
        id = kept[_k];
        newpts[id] = this._modify(render, this.pts[id], this.geoms[id]);
      }
      return this.pts = newpts;
    };

    Layer.prototype._delete = function(render, points) {
      var id2, pt, _results;
      _results = [];
      for (id2 in points) {
        pt = points[id2];
        _results.push(render.remove(pt));
      }
      return _results;
    };

    Layer.prototype._modify = function(render, points, geom) {
      var id2, mark, objs, _ref;
      objs = {};
      _ref = geom.marks;
      for (id2 in _ref) {
        mark = _ref[id2];
        objs[id2] = render.animate(points[id2], mark, geom.evtData);
      }
      return objs;
    };

    Layer.prototype._add = function(render, geom) {
      var id2, mark, objs, _ref;
      objs = {};
      _ref = geom.marks;
      for (id2 in _ref) {
        mark = _ref[id2];
        objs[id2] = render.add(mark, geom.evtData);
      }
      return objs;
    };

    Layer.prototype._makeMappings = function(spec) {
      var aes, _i, _len, _results;
      this.mapping = {};
      this.consts = {};
      _results = [];
      for (_i = 0, _len = aesthetics.length; _i < _len; _i++) {
        aes = aesthetics[_i];
        if (spec[aes]) {
          if (spec[aes]["var"]) this.mapping[aes] = spec[aes]["var"];
          if (spec[aes]["const"]) {
            _results.push(this.consts[aes] = spec[aes]["const"]);
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Layer.prototype._getValue = function(item, aes) {
      if (this.mapping[aes]) return item[this.mapping[aes]];
      if (this.consts[aes]) return sf.identity(this.consts[aes]);
      return sf.identity(this.defaults[aes]);
    };

    Layer.prototype._getIdFunc = function() {
      var _this = this;
      if (this.mapping['id'] != null) {
        return function(item) {
          return _this._getValue(item, 'id');
        };
      } else {
        return poly.counter();
      }
    };

    Layer.prototype._fillZeros = function(data, all_x) {
      var data_x, item, missing, x;
      data_x = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = data.length; _i < _len; _i++) {
          item = data[_i];
          _results.push(this._getValue(item, 'x'));
        }
        return _results;
      }).call(this);
      missing = _.difference(all_x, data_x);
      return {
        x: data_x.concat(missing),
        y: ((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = data.length; _i < _len; _i++) {
            item = data[_i];
            _results.push(this._getValue(item, 'y'));
          }
          return _results;
        }).call(this)).concat((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = missing.length; _i < _len; _i++) {
            x = missing[_i];
            _results.push(0);
          }
          return _results;
        })())
      };
    };

    Layer.prototype._stack = function(group) {
      var data, datas, item, key, tmp, yval, _results,
        _this = this;
      datas = poly.groupBy(this.statData, group);
      _results = [];
      for (key in datas) {
        data = datas[key];
        tmp = 0;
        yval = this.mapping.y != null ? (function(item) {
          return item[_this.mapping.y];
        }) : function(item) {
          return 0;
        };
        _results.push((function() {
          var _i, _len, _results2;
          _results2 = [];
          for (_i = 0, _len = data.length; _i < _len; _i++) {
            item = data[_i];
            item.$lower = tmp;
            tmp += yval(item);
            _results2.push(item.$upper = tmp);
          }
          return _results2;
        })());
      }
      return _results;
    };

    return Layer;

  })();

  Point = (function(_super) {

    __extends(Point, _super);

    function Point() {
      Point.__super__.constructor.apply(this, arguments);
    }

    Point.prototype._calcGeoms = function() {
      var evtData, idfn, item, k, v, _i, _len, _ref, _results;
      idfn = this._getIdFunc();
      this.geoms = {};
      _ref = this.statData;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        evtData = {};
        for (k in item) {
          v = item[k];
          evtData[k] = {
            "in": [v]
          };
        }
        _results.push(this.geoms[idfn(item)] = {
          marks: {
            0: {
              type: 'circle',
              x: this._getValue(item, 'x'),
              y: this._getValue(item, 'y'),
              color: this._getValue(item, 'color'),
              size: this._getValue(item, 'size'),
              opacity: this._getValue(item, 'opacity')
            }
          },
          evtData: evtData
        });
      }
      return _results;
    };

    return Point;

  })(Layer);

  Path = (function(_super) {

    __extends(Path, _super);

    function Path() {
      Path.__super__.constructor.apply(this, arguments);
    }

    Path.prototype._calcGeoms = function() {
      var data, datas, evtData, group, idfn, item, k, key, sample, _i, _len, _results;
      group = (function() {
        var _i, _len, _ref, _results;
        _ref = _.without(_.keys(this.mapping), 'x', 'y');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          k = _ref[_i];
          _results.push(this.mapping[k]);
        }
        return _results;
      }).call(this);
      datas = poly.groupBy(this.statData, group);
      idfn = this._getIdFunc();
      this.geoms = {};
      _results = [];
      for (k in datas) {
        data = datas[k];
        sample = data[0];
        evtData = {};
        for (_i = 0, _len = group.length; _i < _len; _i++) {
          key = group[_i];
          evtData[key] = {
            "in": [sample[key]]
          };
        }
        _results.push(this.geoms[idfn(sample)] = {
          marks: {
            0: {
              type: 'path',
              x: (function() {
                var _j, _len2, _results2;
                _results2 = [];
                for (_j = 0, _len2 = data.length; _j < _len2; _j++) {
                  item = data[_j];
                  _results2.push(this._getValue(item, 'x'));
                }
                return _results2;
              }).call(this),
              y: (function() {
                var _j, _len2, _results2;
                _results2 = [];
                for (_j = 0, _len2 = data.length; _j < _len2; _j++) {
                  item = data[_j];
                  _results2.push(this._getValue(item, 'y'));
                }
                return _results2;
              }).call(this),
              color: this._getValue(sample, 'color'),
              opacity: this._getValue(sample, 'opacity')
            }
          },
          evtData: evtData
        });
      }
      return _results;
    };

    return Path;

  })(Layer);

  Line = (function(_super) {

    __extends(Line, _super);

    function Line() {
      Line.__super__.constructor.apply(this, arguments);
    }

    Line.prototype._calcGeoms = function() {
      var all_x, data, datas, evtData, group, idfn, item, k, key, sample, x, y, _i, _len, _ref, _results;
      all_x = _.uniq((function() {
        var _i, _len, _ref, _results;
        _ref = this.statData;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          _results.push(this._getValue(item, 'x'));
        }
        return _results;
      }).call(this));
      group = (function() {
        var _i, _len, _ref, _results;
        _ref = _.without(_.keys(this.mapping), 'x', 'y');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          k = _ref[_i];
          _results.push(this.mapping[k]);
        }
        return _results;
      }).call(this);
      datas = poly.groupBy(this.statData, group);
      idfn = this._getIdFunc();
      this.geoms = {};
      _results = [];
      for (k in datas) {
        data = datas[k];
        sample = data[0];
        evtData = {};
        for (_i = 0, _len = group.length; _i < _len; _i++) {
          key = group[_i];
          evtData[key] = {
            "in": [sample[key]]
          };
        }
        _ref = this._fillZeros(data, all_x), x = _ref.x, y = _ref.y;
        _results.push(this.geoms[idfn(sample)] = {
          marks: {
            0: {
              type: 'line',
              x: x,
              y: y,
              color: this._getValue(sample, 'color'),
              opacity: this._getValue(sample, 'opacity')
            }
          },
          evtData: evtData
        });
      }
      return _results;
    };

    return Line;

  })(Layer);

  Bar = (function(_super) {

    __extends(Bar, _super);

    function Bar() {
      Bar.__super__.constructor.apply(this, arguments);
    }

    Bar.prototype._calcGeoms = function() {
      var evtData, group, idfn, item, k, v, _i, _len, _ref, _results;
      group = this.mapping.x != null ? [this.mapping.x] : [];
      this._stack(group);
      idfn = this._getIdFunc();
      this.geoms = {};
      _ref = this.statData;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        evtData = {};
        for (k in item) {
          v = item[k];
          if (k !== 'y') {
            evtData[this.mapping[k]] = {
              "in": [v]
            };
          }
        }
        _results.push(this.geoms[idfn(item)] = {
          marks: {
            0: {
              type: 'rect',
              x: [sf.lower(this._getValue(item, 'x')), sf.upper(this._getValue(item, 'x'))],
              y: [item.$lower, item.$upper],
              color: this._getValue(item, 'color'),
              opacity: this._getValue(item, 'opacity')
            }
          },
          evtData: evtData
        });
      }
      return _results;
    };

    return Bar;

  })(Layer);

  Area = (function(_super) {

    __extends(Area, _super);

    function Area() {
      Area.__super__.constructor.apply(this, arguments);
    }

    Area.prototype._calcGeoms = function() {
      var all_x, counters, data, datas, evtData, group, idfn, item, k, key, sample, x, y, y_next, y_previous, _i, _j, _k, _len, _len2, _len3, _results;
      all_x = _.uniq((function() {
        var _i, _len, _ref, _results;
        _ref = this.statData;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          _results.push(this._getValue(item, 'x'));
        }
        return _results;
      }).call(this));
      counters = {};
      for (_i = 0, _len = all_x.length; _i < _len; _i++) {
        key = all_x[_i];
        counters[key] = 0;
      }
      group = (function() {
        var _j, _len2, _ref, _results;
        _ref = _.without(_.keys(this.mapping), 'x', 'y');
        _results = [];
        for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
          k = _ref[_j];
          _results.push(this.mapping[k]);
        }
        return _results;
      }).call(this);
      datas = poly.groupBy(this.statData, group);
      idfn = this._getIdFunc();
      this.geoms = {};
      _results = [];
      for (k in datas) {
        data = datas[k];
        sample = data[0];
        evtData = {};
        for (_j = 0, _len2 = group.length; _j < _len2; _j++) {
          key = group[_j];
          evtData[key] = {
            "in": [sample[key]]
          };
        }
        y_previous = (function() {
          var _k, _len3, _results2;
          _results2 = [];
          for (_k = 0, _len3 = all_x.length; _k < _len3; _k++) {
            x = all_x[_k];
            _results2.push(counters[x]);
          }
          return _results2;
        })();
        for (_k = 0, _len3 = data.length; _k < _len3; _k++) {
          item = data[_k];
          x = this._getValue(item, 'x');
          y = this._getValue(item, 'y');
          counters[x] += y;
        }
        y_next = (function() {
          var _l, _len4, _results2;
          _results2 = [];
          for (_l = 0, _len4 = all_x.length; _l < _len4; _l++) {
            x = all_x[_l];
            _results2.push(counters[x]);
          }
          return _results2;
        })();
        _results.push(this.geoms[idfn(sample)] = {
          marks: {
            0: {
              type: 'area',
              x: all_x,
              y: {
                bottom: y_previous,
                top: y_next
              },
              color: this._getValue(sample, 'color'),
              opacity: this._getValue(sample, 'opacity')
            }
          },
          evtData: evtData
        });
      }
      return _results;
    };

    return Area;

  })(Layer);

  Text = (function(_super) {

    __extends(Text, _super);

    function Text() {
      Text.__super__.constructor.apply(this, arguments);
    }

    Text.prototype._calcGeoms = function() {
      var evtData, idfn, item, k, v, _i, _len, _ref, _results;
      idfn = this._getIdFunc();
      this.geoms = {};
      _ref = this.statData;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        evtData = {};
        for (k in item) {
          v = item[k];
          evtData[k] = {
            "in": [v]
          };
        }
        _results.push(this.geoms[idfn(item)] = {
          marks: {
            0: {
              type: 'text',
              x: this._getValue(item, 'x'),
              y: this._getValue(item, 'y'),
              text: this._getValue(item, 'text'),
              color: this._getValue(item, 'color'),
              size: this._getValue(item, 'size'),
              opacity: this._getValue(item, 'opacity'),
              'text-anchor': 'center'
            }
          },
          evtData: evtData
        });
      }
      return _results;
    };

    return Text;

  })(Layer);

  Tile = (function(_super) {

    __extends(Tile, _super);

    function Tile() {
      Tile.__super__.constructor.apply(this, arguments);
    }

    Tile.prototype._calcGeoms = function() {
      var evtData, idfn, item, x, y, _i, _len, _ref, _results;
      idfn = this._getIdFunc();
      this.geoms = {};
      _ref = this.statData;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        evtData = {};
        x = this._getValue(item, 'x');
        y = this._getValue(item, 'y');
        _results.push(this.geoms[idfn(item)] = {
          marks: {
            0: {
              type: 'rect',
              x: [sf.lower(this._getValue(item, 'x')), sf.upper(this._getValue(item, 'x'))],
              y: [sf.lower(this._getValue(item, 'y')), sf.upper(this._getValue(item, 'y'))],
              color: this._getValue(item, 'color'),
              size: this._getValue(item, 'size'),
              opacity: this._getValue(item, 'opacity')
            }
          },
          evtData: evtData
        });
      }
      return _results;
    };

    return Tile;

  })(Layer);

  Box = (function(_super) {

    __extends(Box, _super);

    function Box() {
      Box.__super__.constructor.apply(this, arguments);
    }

    Box.prototype._calcGeoms = function() {
      var evtData, geom, idfn, index, item, point, x, xl, xm, xu, y, _i, _len, _len2, _ref, _ref2, _results;
      idfn = this._getIdFunc();
      this.geoms = {};
      _ref = this.statData;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        evtData = {};
        x = this._getValue(item, 'x');
        y = this._getValue(item, 'y');
        xl = sf.lower(x);
        xu = sf.upper(x);
        xm = sf.middle(x);
        geom = {
          marks: {
            iqr: {
              type: 'path',
              x: [xl, xl, xu, xu, xl],
              y: [y.q2, y.q4, y.q4, y.q2, y.q2],
              stroke: this._getValue(item, 'color'),
              fill: 'none',
              size: this._getValue(item, 'size'),
              opacity: this._getValue(item, 'opacity')
            },
            lower: {
              type: 'line',
              x: [xm, xm],
              y: [y.q1, y.q2],
              color: this._getValue(item, 'color'),
              size: this._getValue(item, 'size'),
              opacity: this._getValue(item, 'opacity')
            },
            upper: {
              type: 'line',
              x: [xm, xm],
              y: [y.q4, y.q5],
              color: this._getValue(item, 'color'),
              size: this._getValue(item, 'size'),
              opacity: this._getValue(item, 'opacity')
            },
            middle: {
              type: 'line',
              x: [xl, xu],
              y: [y.q3, y.q3],
              color: this._getValue(item, 'color'),
              size: this._getValue(item, 'size'),
              opacity: this._getValue(item, 'opacity')
            }
          },
          evtData: evtData
        };
        _ref2 = y.outliers;
        for (index = 0, _len2 = _ref2.length; index < _len2; index++) {
          point = _ref2[index];
          geom.marks[index] = {
            type: 'circle',
            x: xm,
            y: point,
            color: this._getValue(item, 'color'),
            size: this._getValue(item, 'size'),
            opacity: this._getValue(item, 'opacity')
          };
        }
        _results.push(this.geoms[idfn(item)] = geom);
      }
      return _results;
    };

    return Box;

  })(Layer);

  /*
  # EXPORT
  */

  this.poly = poly;

}).call(this);
