import AppKit
import WebKit
import Network

// Loopback only: serves immutable bundled assets, with no shell or filesystem bridge.
final class AssetServer {
    let root: URL
    let queue = DispatchQueue(label: "studio.midnight-run.assets")
    var listener: NWListener?
    init(root: URL) { self.root = root.resolvingSymlinksInPath() }
    func start(ready: @escaping (Result<URL, Error>) -> Void) {
        do {
            let parameters = NWParameters.tcp
            parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: 4188)
            let listener = try NWListener(using: parameters)
            self.listener = listener
            listener.stateUpdateHandler = { state in
                switch state {
                case .ready: DispatchQueue.main.async { ready(.success(URL(string: "http://127.0.0.1:4188/")!)) }
                case .failed(let error): DispatchQueue.main.async { ready(.failure(error)) }
                default: break
                }
            }
            listener.newConnectionHandler = { [weak self] connection in
                guard let self else { return }
                connection.start(queue: self.queue)
                self.read(connection, buffer: Data())
                self.queue.asyncAfter(deadline: .now() + 15) { connection.cancel() }
            }
            listener.start(queue: queue)
        } catch { ready(.failure(error)) }
    }
    func read(_ connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] data, _, complete, error in
            guard let self else { return }
            var buffer = buffer; buffer.append(data ?? Data())
            if buffer.count > 16384 { connection.cancel(); return }
            if let request = String(data: buffer, encoding: .utf8), request.contains("\r\n\r\n") { self.respond(connection, request: request) }
            else if !complete && error == nil { self.read(connection, buffer: buffer) }
            else { connection.cancel() }
        }
    }
    func respond(_ connection: NWConnection, request: String) {
        let parts = request.components(separatedBy: "\r\n")[0].split(separator: " ")
        guard parts.count == 3, parts[0] == "GET" || parts[0] == "HEAD" else { connection.cancel(); return }
        let raw = String(parts[1]).components(separatedBy: "?")[0]
        let path = raw.removingPercentEncoding ?? ""
        let file = root.appendingPathComponent(path == "/" ? "index.html" : String(path.dropFirst())).standardizedFileURL.resolvingSymlinksInPath()
        guard path.hasPrefix("/"), file.path.hasPrefix(root.path + "/") else { connection.cancel(); return }
        let body = (try? Data(contentsOf: file))
        let types = ["html":"text/html; charset=utf-8", "js":"application/javascript", "css":"text/css", "json":"application/json", "wasm":"application/wasm", "glb":"model/gltf-binary", "ttf":"font/ttf", "woff2":"font/woff2", "png":"image/png", "txt":"text/plain; charset=utf-8", "svg":"image/svg+xml"]
        let payload = body ?? Data("Not found".utf8)
        let mime = types[file.pathExtension] ?? "application/octet-stream"
        var response = Data("HTTP/1.1 \(body == nil ? "404 Not Found" : "200 OK")\r\nContent-Type: \(mime)\r\nContent-Length: \(payload.count)\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n".utf8)
        if parts[0] == "GET" { response.append(payload) }
        connection.send(content: response, completion: .contentProcessed { _ in connection.cancel() })
    }
}

final class GameApp: NSObject, NSApplicationDelegate, WKNavigationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var server: AssetServer!
    var qaTimer: Timer?
    var qaStarted = false
    var qaShots = Set<String>()
    var qaSamples: [[String:Any]] = []
    var qaTicks = 0
    let qaDirectory: String? = {
        let args = CommandLine.arguments
        guard let i = args.firstIndex(of: "--qa-output"), args.count > i + 1 else { return nil }
        return args[i + 1]
    }()
    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu(), appMenu = NSMenu()
        let appItem = NSMenuItem(); appItem.submenu = appMenu; menu.addItem(appItem)
        appMenu.addItem(withTitle: "Quit Midnight Run", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let viewMenu = NSMenu(title: "View"), viewItem = NSMenuItem(); viewItem.submenu = viewMenu; menu.addItem(viewItem)
        let fullscreen = viewMenu.addItem(withTitle: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fullscreen.keyEquivalentModifierMask = [.command, .control]
        NSApp.mainMenu = menu
        let configuration = WKWebViewConfiguration()
        configuration.preferences.isElementFullscreenEnabled = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        if qaDirectory != nil { configuration.userContentController.addUserScript(WKUserScript(source: "window.__qaErrors=[];window.addEventListener('error',e=>window.__qaErrors.push(e.message));", injectionTime: .atDocumentStart, forMainFrameOnly: true)) }
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1440, height: 900), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Midnight Run — Tokyo After Dark"
        window.minSize = NSSize(width: 960, height: 640)
        window.contentView = webView; window.delegate = self; window.center()
        window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        guard let root = Bundle.main.resourceURL?.appendingPathComponent("web") else { return }
        server = AssetServer(root: root)
        server.start { [weak self] result in
            switch result {
            case .success(let url): self?.webView.load(URLRequest(url: url))
            case .failure(let error): self?.showError("The local game could not start. Close any other Midnight Run window and try again.\n\(error.localizedDescription)")
            }
        }
        if qaDirectory != nil {
            qaTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in self?.checkQA() }
            DispatchQueue.main.asyncAfter(deadline: .now() + 100) { if !self.qaStarted { self.writeQA(["error":"scene load timed out"]); NSApp.terminate(nil) } }
        }
    }
    func showError(_ message: String) { let alert = NSAlert(); alert.messageText = "Midnight Run"; alert.informativeText = message; alert.runModal() }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { server?.listener?.cancel() }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if navigationAction.navigationType == .linkActivated && url.path == "/assets/CREDITS.txt" {
            let alert=NSAlert(); alert.messageText="Asset credits"; alert.informativeText=(try? String(contentsOf: Bundle.main.resourceURL!.appendingPathComponent("web/assets/CREDITS.txt"), encoding:.utf8)) ?? "Credits are bundled with this app."; alert.runModal(); decisionHandler(.cancel); return
        }
        let local = url.scheme == "http" && url.host == "127.0.0.1" && url.port == 4188
        if local && navigationAction.targetFrame?.isMainFrame != false { decisionHandler(.allow) }
        else { decisionHandler(.cancel) }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { showError("The graphics process stopped. Please reopen the game.") }
    // Optional, explicit developer smoke test for the actual packaged WKWebView.
    func checkQA() {
        if qaStarted { tickQA(); return }
        webView.evaluateJavaScript("Boolean(window.__midnight?.state.assetsReady)") { [weak self] value, error in
            guard let self, value as? Bool == true else { return }
            self.qaStarted = true
            self.snapshot("mac-intro.png")
            self.webView.evaluateJavaScript("document.querySelector('[data-ride=ferrari]').click();document.querySelector('#start').click();window.__qaKey=(code,down)=>window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,key:code.slice(-1).toLowerCase(),bubbles:true}));window.__qaDrive=setInterval(()=>{const s=window.__midnight.state;if(s.mode==='paused'&&s.s<2600)document.querySelector('#resume-btn')?.click();if(s.mode==='race'||s.mode==='countdown'){__qaKey('KeyW',true);__qaKey('KeyA',s.lane>.45);__qaKey('KeyD',s.lane<-.45);}},100);")
        }
    }
    func tickQA() {
        qaTicks += 1
        webView.evaluateJavaScript("JSON.stringify({state:window.__midnight.state,fps:document.querySelector('#fps').textContent,errors:window.__qaErrors,resourceOrigins:[...new Set(performance.getEntriesByType('resource').map(r=>new URL(r.name).origin))]})") { [weak self] value, error in
            guard let self, let value=value as? String, let data=value.data(using:.utf8), let result=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any], let state=result["state"] as? [String:Any], let station=state["s"] as? Double else { return }
            self.qaSamples.append(["s":station,"fps":result["fps"] ?? "", "maxOverlap":state["maxOverlap"] ?? -1])
            for (at,name) in [(180.0,"mac-tower.png"),(800.0,"mac-akabanebashi.png"),(1850.0,"mac-hibiya.png")] {
                if station>at && !self.qaShots.contains(name) { self.qaShots.insert(name); self.snapshot(name) }
            }
            if (state["mode"] as? String == "paused" && station>2600) || self.qaTicks>100 {
                self.qaTimer?.invalidate()
                self.webView.evaluateJavaScript("clearInterval(window.__qaDrive);['KeyW','KeyA','KeyD'].forEach(c=>__qaKey(c,false));")
                let samples=(try? JSONSerialization.data(withJSONObject:self.qaSamples)) ?? Data()
                self.writeQA(["result":value,"samples":String(data:samples,encoding:.utf8) ?? "[]", "renderer":"WKWebView"])
                self.snapshot("mac-finish.png") { NSApp.terminate(nil) }
            }
        }
    }
    func snapshot(_ name: String, completion: (() -> Void)? = nil) {
        guard let directory = qaDirectory else { return }
        webView.takeSnapshot(with: nil) { image, error in
            defer { completion?() }
            guard let data = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: data), let png = bitmap.representation(using: .png, properties: [:]) else { return }
            try? png.write(to: URL(fileURLWithPath: directory).appendingPathComponent(name))
        }
    }
    func writeQA(_ object: [String:String]) {
        guard let directory = qaDirectory, let data = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted]) else { return }
        try? data.write(to: URL(fileURLWithPath: directory).appendingPathComponent("native-result.json"))
    }
}
let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = GameApp()
app.delegate = delegate
app.run()
