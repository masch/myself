import ExpoModulesCore
import AVFoundation

struct StartSessionOptionsRecord: Record {
  @Field var targetEpochMs: Double = 0.0
  @Field var targetTimeFormatted: String = ""
}

public class MeditationSessionModule: Module {
  private var timer: Timer?
  private var isActive: Bool = false

  public func definition() -> ModuleDefinition {
    Name("MeditationSession")

    Events("onSessionCompleted")

    Function("startSession") { (options: StartSessionOptionsRecord) -> Bool in
      self.timer?.invalidate()
      self.isActive = true

      let remainingSeconds = max(0, (options.targetEpochMs - (Date().timeIntervalSince1970 * 1000)) / 1000)

      DispatchQueue.main.async {
        self.timer = Timer.scheduledTimer(withTimeInterval: remainingSeconds, repeats: false) { [weak self] _ in
          guard let self = self else { return }
          self.isActive = false
          self.sendEvent("onSessionCompleted")
        }
      }
      return true
    }

    Function("stopSession") { () -> Bool in
      self.timer?.invalidate()
      self.timer = nil
      self.isActive = false
      return true
    }

    Function("isSessionActive") { () -> Bool in
      return self.isActive
    }
  }
}
