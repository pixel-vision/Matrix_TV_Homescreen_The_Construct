package app.couchtv.launcher

import android.graphics.Color
import android.service.dreams.DreamService
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream

/**
 * The Crypt screensaver: green code rain with the terminal clock, the date and the local weather
 * (tv-home/web/saver.html, built into the app). The TV starts it when it has been idle; any button
 * ends it. apply.sh (or apply.py) makes it the TV's screensaver only when asked to, and undo puts
 * the TV's own one back. It reads the same settings the home has (people aside): the clock, the
 * weather's place and the language, from what apply handed the app, else the built-in defaults.
 * Nothing here touches the network except the page's own weather call to Open-Meteo and, with
 * home.govee, the Govee lights on the home Wi-Fi (Govee.kt).
 */
class CryptDream : DreamService() {
    private var web: WebView? = null

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        isInteractive = false   // any button wakes the TV back to whatever was on
        isFullscreen = true
        isScreenBright = true
        // black from the very first frame to the last, so the screensaver never opens or closes on a colour
        window?.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(Color.BLACK))
        // drawn on the GPU, like the home: the rain and the fights are canvas work
        window?.addFlags(android.view.WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED)
        val w = WebView(this)
        w.setBackgroundColor(Color.BLACK)
        w.settings.javaScriptEnabled = true
        w.settings.domStorageEnabled = true
        w.settings.textZoom = 100
        w.settings.mediaPlaybackRequiresUserGesture = false   // the typing clicks, when home.crypt_sound is on
        w.addJavascriptInterface(Govee.Page(this), "TVGOVEE")   // the lights breathe with it (home.govee)
        w.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest) = true

            override fun shouldInterceptRequest(view: WebView, req: WebResourceRequest): WebResourceResponse? {
                val u = req.url
                if (u.host != HOST) return null
                val rel = (u.path ?: "").removePrefix("/tv/").ifEmpty { "saver.html" }
                if (rel.contains("..")) return notFound()
                if (rel == "config.js") {
                    getSharedPreferences("home", MODE_PRIVATE).getString("config", null)?.let { given ->
                        val js = "window.COUCH_CONFIG = $given;\n".toByteArray()
                        return WebResourceResponse("application/javascript", "utf-8", ByteArrayInputStream(js))
                    }
                }
                val ext = rel.substringAfterLast('.', "").lowercase()
                val type = when (ext) {
                    "html" -> "text/html"
                    "js" -> "application/javascript"
                    "css" -> "text/css"
                    "woff" -> "font/woff"
                    "woff2" -> "font/woff2"
                    "ttf" -> "font/ttf"
                    else -> "application/octet-stream"
                }
                val text = type.startsWith("text/") || type.endsWith("javascript")
                return try {
                    WebResourceResponse(type, if (text) "utf-8" else null, assets.open("www/tv/$rel"))
                } catch (e: Exception) {
                    notFound()
                }
            }
        }
        web = w
        setContentView(w)
        w.loadUrl("http://$HOST/tv/saver.html")
    }

    override fun onDetachedFromWindow() {
        web?.let { it.stopLoading(); it.destroy() }
        web = null
        super.onDetachedFromWindow()
    }

    private fun notFound() =
        WebResourceResponse("text/plain", "utf-8", 404, "Not found", emptyMap(), ByteArrayInputStream(ByteArray(0)))

    companion object {
        // the home's own address, so the two share their saved state (the red pill, today's log)
        private const val HOST = "home.tvos.invalid"
    }
}
