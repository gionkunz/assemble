/**
 * Assemble <http://assemble.io>
 *
 * Copyright (c) 2014 Jon Schlinkert, Brian Woodward, contributors
 * Licensed under the MIT License (MIT).
 */

'use strict';

var file = require('fs-utils');
var async = require('async');
var _ = require('lodash');

// Local libs
var config = require('../config');
var notifier = require('./notifier');
var registerMixins = require('./mixins');
var Component = require('../models/component');
var events = config.plugins.events;

module.exports = function(assemble, done) {

  assemble.log.debug('Running config steps');

  // setup parameters to pass to plugins
  var params = {};

  // setup a notifier to notify plugins
  var notify = notifier(assemble, params);

  // run steps in series so we can notify plugins
  // before and after the config steps are done.
  async.series([

    // notify plugins before configuration
    notify(events.assembleBeforeConfiguration),

    // do some configuration setup
    function (next) {
      assemble.log.debug('Doing some configuration work here.');
      next();
    },

    // configure the rendering engine
    function (next) {

      // setup the engine
      assemble.engine = assemble.render.engine.get(
        assemble,
        assemble.options.engine || assemble.defaults.engine,
        assemble.options
      );

      assemble.engine.init(next);
    },

    // config options and data
    function (next) {

      // normalize file paths
      assemble.options.data = file.expand(assemble.options.data || []);
      assemble.options.partials = file.expand(assemble.options.partials || assemble.options.includes || []);

      // expose some options to the `assemble` object
      assemble.partials = assemble.options.partials || [];
      assemble.helpers = assemble.options.helpers || [];
      assemble.mixins = assemble.options.mixins || [];

      // if source is a string, use it to render
      if (_.isString(assemble.source)) {
        assemble.options.components = assemble.options.components || [];
        var component = new Component({
          raw: assemble.source || ''
        });
        assemble.options.components.push(component);
      }

      // if the current engine handles layouts, load the default layout
      if (assemble.engine.handlesLayouts) {
        assemble.engine.loadDefaultLayout(next);
      } else {
        next();
      }
    },

    // register mixins with Lo-Dash
    function (next) {
      registerMixins(assemble, next);
    },

    function (next) {
      // register helpers for the current engine
      assemble.registerHelpers(assemble.helpers, next);
    },

    // notify plugins after configuration
    notify(events.assembleAfterConfiguration)

  ],
  done);
};