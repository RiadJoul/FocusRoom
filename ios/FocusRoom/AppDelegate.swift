import Expo
import React
import ReactAppDependencyProvider
import UIKit

// Copies the app logo into the shared App Group so the Screen Time shield
// extension can load it from `shield/logo.png`.
private func copyShieldLogoIfNeeded() {
  let appGroupId = "group.com.anonymous.focusRoom"

  guard let containerURL = FileManager.default
    .containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
    print("[ShieldLogo] Missing app group container")
    return
  }

  let fileManager = FileManager.default
  let shieldDir = containerURL.appendingPathComponent("shield", isDirectory: true)

  if !fileManager.fileExists(atPath: shieldDir.path) {
    do {
      try fileManager.createDirectory(at: shieldDir, withIntermediateDirectories: true)
    } catch {
      print("[ShieldLogo] Failed to create shield directory:", error)
      return
    }
  }

  let destinationURL = shieldDir.appendingPathComponent("logo.png")
  if fileManager.fileExists(atPath: destinationURL.path) {
    // Already copied once.
    return
  }

  // Use an existing app image asset as the shield logo.
  // Adjust "ios-light" to match the asset name you want to show.
  guard let image = UIImage(named: "ShieldLogo") else {
    print("[ShieldLogo] Could not load source icon image")
    return
}

  guard let pngData = image.pngData() else {
    print("[ShieldLogo] Failed to generate PNG data from image")
    return
  }

  do {
    try pngData.write(to: destinationURL, options: .atomic)
    print("[ShieldLogo] Wrote shield/logo.png to app group")
  } catch {
    print("[ShieldLogo] Failed to write shield logo:", error)
  }
}

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)

    // Ensure the Screen Time shield can load the FocusRoom logo from the
    // shared App Group (shield/logo.png).
    copyShieldLogoIfNeeded()
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
