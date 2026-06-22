#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Capacitor plugin bridge — exposes LiquidGlassPlugin (Swift) to JS.
CAP_PLUGIN(LiquidGlassPlugin, "LiquidGlass",
  CAP_PLUGIN_METHOD(show, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(update, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(hide, CAPPluginReturnPromise);
)
