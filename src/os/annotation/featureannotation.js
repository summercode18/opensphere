goog.provide('os.annotation.FeatureAnnotation');

goog.require('ol.OverlayPositioning');
goog.require('os.annotation');
goog.require('os.annotation.AbstractAnnotation');
goog.require('os.annotation.featureAnnotationDirective');
goog.require('os.webgl.WebGLOverlay');
goog.require('os.xml');


/**
 * An annotation tied to an OpenLayers feature.
 *
 * @param {!ol.Feature} feature The OpenLayers feature.
 * @extends {os.annotation.AbstractAnnotation}
 * @constructor
 */
os.annotation.FeatureAnnotation = function(feature) {
  /**
   * The overlay.
   * @type {os.webgl.WebGLOverlay}
   * @protected
   */
  this.overlay = null;

  /**
   * The OpenLayers feature.
   * @type {!ol.Feature}
   * @protected
   */
  this.feature = feature;

  // call the base constructor after we've set up the feature
  os.annotation.FeatureAnnotation.base(this, 'constructor');

  ol.events.listen(this.feature, ol.events.EventType.CHANGE, this.handleFeatureChange, this);
};
goog.inherits(os.annotation.FeatureAnnotation, os.annotation.AbstractAnnotation);


/**
 * @inheritDoc
 */
os.annotation.FeatureAnnotation.prototype.disposeInternal = function() {
  os.annotation.FeatureAnnotation.base(this, 'disposeInternal');

  ol.events.unlisten(this.feature, ol.events.EventType.CHANGE, this.handleFeatureChange, this);
};


/**
 * @inheritDoc
 */
os.annotation.FeatureAnnotation.prototype.getOptions = function() {
  return /** @type {osx.annotation.Options|undefined} */ (this.feature.get(os.annotation.OPTIONS_FIELD));
};


/**
 * @inheritDoc
 */
os.annotation.FeatureAnnotation.prototype.setOptions = function(options) {
  this.feature.set(os.annotation.OPTIONS_FIELD, options);
};


/**
 * @inheritDoc
 */
os.annotation.FeatureAnnotation.prototype.setVisibleInternal = function() {
  if (this.overlay && this.feature) {
    var options = this.getOptions();

    // show the overlay when internal flag is set and configured to be displayed. this allows for separate states
    // between config and the feature.
    var showOverlay = this.visible && options.show;
    os.annotation.setPosition(this.overlay, showOverlay ? this.feature : null);
  }
};


/**
 * @inheritDoc
 */
os.annotation.FeatureAnnotation.prototype.createUI = function() {
  var options = this.getOptions();

  if (this.overlay || !options) {
    // don't create the overlay if it already exists or options are missing
    return;
  }

  this.overlay = new os.webgl.WebGLOverlay({
    id: ol.getUid(this.feature),
    offset: options.offset,
    positioning: ol.OverlayPositioning.CENTER_CENTER
  });

  // create an Angular scope for the annotation UI
  var compile = /** @type {!angular.$compile} */ (os.ui.injector.get('$compile'));
  this.scope = /** @type {!angular.Scope} */ (os.ui.injector.get('$rootScope').$new());

  ol.obj.assign(this.scope, {
    'feature': this.feature,
    'overlay': this.overlay
  });

  // compile the template and assign the element to the overlay
  var template = '<featureannotation feature="feature" overlay="overlay"></featureannotation>';
  this.element = /** @type {Element} */ (compile(template)(this.scope)[0]);
  this.overlay.setElement(this.element);

  // add the overlay to the map
  var map = os.MapContainer.getInstance().getMap();
  if (map) {
    map.addOverlay(this.overlay);
  }

  if (this.visible && options.show) {
    // setting an initial position causes the overlay to render
    var geometry = this.feature.getGeometry();
    var coordinate = geometry instanceof ol.geom.SimpleGeometry ? geometry.getFirstCoordinate() : [0, 0];

    this.overlay.setPosition(coordinate);
  }

  this.setVisibleInternal();
};


/**
 * @inheritDoc
 */
os.annotation.FeatureAnnotation.prototype.disposeUI = function() {
  if (this.overlay) {
    // remove the overlay from the map
    var map = os.MapContainer.getInstance().getMap();
    if (map) {
      map.removeOverlay(this.overlay);
    }

    // dispose of the overlay
    this.overlay.dispose();
    this.overlay = null;
  }

  // destroy the scope
  if (this.scope) {
    this.scope.$destroy();
    this.scope = null;
  }

  this.element = null;
};


/**
 * Update the annotation when the feature changes.
 *
 * @protected
 */
os.annotation.FeatureAnnotation.prototype.handleFeatureChange = function() {
  this.setVisibleInternal();
};
