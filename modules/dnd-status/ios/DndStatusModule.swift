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
  }
}
