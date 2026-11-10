package app.couchtv.launcher

import android.content.Context
import android.net.wifi.WifiManager
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.SocketTimeoutException
import java.util.concurrent.Executors

/**
 * Govee lights on the home Wi-Fi, through Govee's own LAN API: "LAN Control" switched on for each
 * light in the Govee app. The page (crypt.js, the Crypt look) finds them and sets their colour.
 * Only lights that answered the scan can be sent anything, and only on Govee's LAN port.
 *
 *   scan: a multicast "scan" to 239.255.255.250:4001; each light answers on port 4002
 *   send: one JSON command to a light's port 4003 (turn, brightness, colorwc, ptReal)
 */
object Govee {
    private val io = Executors.newSingleThreadExecutor()
    @Volatile private var found: List<JSONObject> = emptyList()
    @Volatile private var scanning = false
    private val IP = Regex("^(\\d{1,3}\\.){3}\\d{1,3}$")

    fun scan(ctx: Context, waitMs: Long = 2500) {
        if (scanning) return
        scanning = true
        io.execute {
            val seen = LinkedHashMap<String, JSONObject>()
            val wifi = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val lock = wifi.createMulticastLock("couchtv-govee").apply { setReferenceCounted(false) }
            try {
                lock.acquire()
                DatagramSocket(null).use { rx ->
                    rx.reuseAddress = true
                    rx.bind(InetSocketAddress(4002))
                    rx.soTimeout = 300
                    val msg = """{"msg":{"cmd":"scan","data":{"account_topic":"reserve"}}}""".toByteArray()
                    DatagramSocket().use { tx ->
                        tx.send(DatagramPacket(msg, msg.size, InetAddress.getByName("239.255.255.250"), 4001))
                    }
                    val end = System.currentTimeMillis() + waitMs
                    val buf = ByteArray(2048)
                    while (System.currentTimeMillis() < end) {
                        try {
                            val p = DatagramPacket(buf, buf.size)
                            rx.receive(p)
                            val d = JSONObject(String(p.data, 0, p.length)).getJSONObject("msg").getJSONObject("data")
                            val ip = d.optString("ip").ifEmpty { p.address.hostAddress ?: "" }
                            if (IP.matches(ip)) {
                                seen[ip] = JSONObject().put("ip", ip).put("sku", d.optString("sku")).put("device", d.optString("device"))
                            }
                        } catch (e: SocketTimeoutException) {
                            // keep listening until the time is up
                        } catch (e: Exception) {
                            // not a Govee answer
                        }
                    }
                }
            } catch (e: Exception) {
                // no Wi-Fi, or the port is taken: no lights this time
            } finally {
                try { lock.release() } catch (e: Exception) {}
                found = seen.values.toList()
                scanning = false
            }
        }
    }

    fun send(ip: String, json: String): Boolean {
        if (found.none { it.optString("ip") == ip } || json.length > 2000) return false
        io.execute {
            try {
                val b = json.toByteArray()
                DatagramSocket().use { it.send(DatagramPacket(b, b.size, InetAddress.getByName(ip), 4003)) }
            } catch (e: Exception) {
                // the light is off or gone; the next scan finds what is there
            }
        }
        return true
    }

    /** window.TVGOVEE for the page. */
    class Page(private val ctx: Context) {
        @JavascriptInterface fun scan() = Govee.scan(ctx)
        @JavascriptInterface fun scanning(): Boolean = Govee.scanning
        @JavascriptInterface fun devices(): String = JSONArray(Govee.found).toString()
        @JavascriptInterface fun send(ip: String, json: String): Boolean = Govee.send(ip, json)
    }
}
