package bot.tab.sites.facefang;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.content.FileProvider;
import java.io.File;
import java.util.ArrayList;

/** FaceFang Arena: a thin full-screen WebView around https://facefang.sites.tab.bot/ with camera + gallery for the face photo. */
public class MainActivity extends Activity {
    private static final String HOME = "https://facefang.sites.tab.bot/";
    private static final int REQ_FILE = 11, REQ_CAM_PERM = 12;
    private WebView web;
    private ValueCallback<Uri[]> pending;
    private WebChromeClient.FileChooserParams pendingParams;
    private Uri cameraUri;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0b1026"));
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " FaceFangApp/1.0");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("facefang.sites.tab.bot".equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException e) { }
                return true;
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) v.loadData("<html><body style='background:#0b1026;color:#fff;font-family:sans-serif;text-align:center;padding-top:40vh'><h2>No internet</h2><p>FaceFang Arena needs internet.</p><button style='font-size:18px;padding:12px 24px;border-radius:12px' onclick='location.href=\"" + HOME + "\"'>Try again</button></body></html>", "text/html", "utf-8");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (pending != null) pending.onReceiveValue(null);
                pending = cb; pendingParams = p;
                if (p.isCaptureEnabled() && Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAM_PERM);
                } else openChooser();
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        Uri data = getIntent() != null ? getIntent().getData() : null;
        web.loadUrl(data != null && "facefang.sites.tab.bot".equals(data.getHost()) ? data.toString() : HOME);
        hideBars();
    }

    private void openChooser() {
        boolean capture = pendingParams != null && pendingParams.isCaptureEnabled();
        boolean camOk = Build.VERSION.SDK_INT < 23 || checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        Intent cam = null;
        if (camOk) {
            try {
                File dir = new File(getCacheDir(), "shots"); dir.mkdirs();
                File f = new File(dir, "face_" + System.currentTimeMillis() + ".jpg");
                cameraUri = FileProvider.getUriForFile(this, "bot.tab.sites.facefang.files", f);
                cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                cam.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                cam.putExtra("android.intent.extras.CAMERA_FACING", 1);
                cam.putExtra("android.intent.extras.LENS_FACING_FRONT", 1);
                cam.putExtra("android.intent.extra.USE_FRONT_CAMERA", true);
                cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception e) { cam = null; cameraUri = null; }
        }
        Intent gallery = new Intent(Intent.ACTION_GET_CONTENT);
        gallery.addCategory(Intent.CATEGORY_OPENABLE);
        gallery.setType("image/*");
        Intent chooser;
        if (capture && cam != null) chooser = cam;
        else {
            chooser = Intent.createChooser(gallery, "Choose a photo");
            if (cam != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cam});
        }
        try { startActivityForResult(chooser, REQ_FILE); }
        catch (ActivityNotFoundException e) { if (pending != null) pending.onReceiveValue(null); pending = null; }
    }

    @Override public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        if (code == REQ_CAM_PERM) openChooser();
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        if (req != REQ_FILE) { super.onActivityResult(req, res, data); return; }
        if (pending == null) return;
        Uri[] out = null;
        if (res == RESULT_OK) {
            if (data != null && data.getData() != null) out = new Uri[]{data.getData()};
            else if (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0) out = new Uri[]{data.getClipData().getItemAt(0).getUri()};
            else if (cameraUri != null) out = new Uri[]{cameraUri};
        }
        pending.onReceiveValue(out); pending = null; pendingParams = null;
    }

    @Override public void onBackPressed() {
        web.evaluateJavascript("(window.ffBack && window.ffBack()) ? 'y' : 'n'", v -> {
            if (v == null || !v.contains("y")) { if (web.canGoBack()) web.goBack(); else finish(); }
        });
    }

    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) hideBars(); }
    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }
    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); Uri d = i.getData(); if (d != null && "facefang.sites.tab.bot".equals(d.getHost())) web.loadUrl(d.toString()); }
}
