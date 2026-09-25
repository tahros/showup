# Restoring bounce in the Xcode app

The PWA animation and native iOS scroll bounce are different layers.
Capacitor 8.5.2 initializes its WKWebView with scrollView.bounces = false.
ShowUp installs a subclass that enables bounce (including short pages) after
Capacitor loads and when the controller appears.

An OTA update cannot install that Swift class or change the storyboard.
Seeing a recent web version in Settings is not proof of a recent native build.

On the Mac, in the ShowUp repository:

    git pull --ff-only
    npm install
    npm run sync:ios
    npm run open:ios

The sync command must end with "bounce controller installed and storyboard
verified". It now fails if it cannot wire the controller. Do not substitute
npx cap sync ios alone: that skips ShowUp's native configuration step.

In Xcode, stop the app and build/run it again. Do not delete the app or its
data. In the Debug console, look for:

    [ShowUp] Native scroll bounce: enabled=true, vertical=true

The generated AppDelegate.swift must contain ShowUpViewController, and
Main.storyboard's initial Capacitor scene must use that class in module App.
The installer updates the previously generated class rather than duplicating it.

On-device acceptance:

- Drag gently past the top and bottom of a long History or Stats page.
- Repeat on a short page; vertical bounce should still be enabled.
- Check the existing top pull-to-refresh gesture, without changing workout data.
- Open/close a sheet, rotate back to portrait, and repeat.
- Ensure the floating bars and exercise controls remain usable.

Automated fixture tests prove generation/wiring and safe upgrades. They do
not simulate UIKit physics; final feel and compilation need the Mac/Xcode
build and a simulator or iPhone.

References: [Capacitor 8.5.2 native setup](https://github.com/ionic-team/capacitor/blob/8.5.2/ios/Capacitor/Capacitor/CAPBridgeViewController.swift)
and [supported controller subclassing](https://capacitorjs.com/docs/ios/viewcontroller).
