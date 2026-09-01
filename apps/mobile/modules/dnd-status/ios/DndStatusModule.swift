import ExpoModulesCore

public class DndStatusModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DndStatus")

    Function("isDndActive") { () -> Bool in
      return false
    }

    Function("isSupported") { () -> Bool in
      return false
    }

    Function("isNotificationPolicyAccessGranted") { () -> Bool in
      return false
    }

    Function("setDndActive") { (active: Bool) -> Bool in
      return false
    }

    Function("openDndSettings") { () -> Void in
      // No-op on iOS
    }
  }
}
