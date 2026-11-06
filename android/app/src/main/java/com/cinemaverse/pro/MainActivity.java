package com.cinemaverse.pro;

import android.annotation.SuppressLint;
import android.app.UiModeManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    private static final String PREFS_NAME = "cinemaverse_app_prefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final int REQUEST_CODE_VOICE_SEARCH = 2001;
    private static final int REQUEST_RECORD_AUDIO_PERMISSION = 2002;

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private FrameLayout customViewContainer;
    private LinearLayout errorLayout;
    private TextView errorUrlText;
    private Button btnRetry;
    private Button btnChangeServer;

    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private int originalOrientation;
    private int originalSystemUiVisibility;

    private long backPressedTime = 0;
    private SharedPreferences preferences;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        preferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        webView = findViewById(R.id.webview);
        swipeRefresh = findViewById(R.id.swipe_refresh);
        progressBar = findViewById(R.id.progress_bar);
        customViewContainer = findViewById(R.id.custom_view_container);
        errorLayout = findViewById(R.id.error_layout);
        errorUrlText = findViewById(R.id.error_url_text);
        btnRetry = findViewById(R.id.btn_retry);
        btnChangeServer = findViewById(R.id.btn_change_server);

        setupSwipeRefresh();
        setupWebView();
        setupButtons();

        // Load the CinemaVerse URL
        loadCurrentUrl();
    }

    private String getTargetUrl() {
        String defaultUrl = getString(R.string.default_web_url);
        String baseUrl = preferences.getString(KEY_SERVER_URL, defaultUrl);
        if (isTelevision()) {
            if (!baseUrl.contains("/tv")) {
                if (baseUrl.endsWith("/")) {
                    return baseUrl + "tv";
                } else {
                    return baseUrl + "/tv";
                }
            }
        }
        return baseUrl;
    }

    private void saveTargetUrl(String url) {
        if (url == null || url.trim().isEmpty()) return;
        String cleanUrl = url.trim();
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
            cleanUrl = "https://" + cleanUrl;
        }
        preferences.edit().putString(KEY_SERVER_URL, cleanUrl).apply();
    }

    private void loadCurrentUrl() {
        String url = getTargetUrl();
        errorLayout.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        webView.loadUrl(url);
    }

    public boolean isTelevision() {
        try {
            UiModeManager uiModeManager = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
            if (uiModeManager != null && uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION) {
                return true;
            }
        } catch (Exception ignored) {}
        try {
            if (getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK)) {
                return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    private void setupSwipeRefresh() {
        if (isTelevision()) {
            // Disable swipe pull-to-refresh on Smart TV to prevent D-pad directional focus traps
            swipeRefresh.setEnabled(false);
            return;
        }
        swipeRefresh.setColorSchemeResources(R.color.brand_red);
        swipeRefresh.setProgressBackgroundColorSchemeResource(R.color.bg_surface);
        swipeRefresh.setOnRefreshListener(() -> {
            errorLayout.setVisibility(View.GONE);
            webView.reload();
        });
    }

    private void setupButtons() {
        btnRetry.setOnClickListener(v -> {
            loadCurrentUrl();
        });

        btnChangeServer.setOnClickListener(v -> showChangeServerDialog());

        // Long press anywhere with 2 fingers or long press error URL to edit server
        errorUrlText.setOnClickListener(v -> showChangeServerDialog());
    }

    private void showChangeServerDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(R.string.dialog_server_title);
        builder.setMessage(R.string.dialog_server_desc);

        final EditText input = new EditText(this);
        input.setText(getTargetUrl());
        input.setSelection(input.getText().length());
        input.setTextColor(getResources().getColor(R.color.text_white));
        input.setPadding(40, 20, 40, 20);
        builder.setView(input);

        builder.setPositiveButton(R.string.dialog_save, (dialog, which) -> {
            String newUrl = input.getText().toString();
            saveTargetUrl(newUrl);
            Toast.makeText(MainActivity.this, "Connecting to: " + getTargetUrl(), Toast.LENGTH_SHORT).show();
            loadCurrentUrl();
        });

        builder.setNegativeButton(R.string.dialog_cancel, (dialog, which) -> dialog.cancel());
        builder.show();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        // 1. JavaScript & Storage
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // 2. Hardware Acceleration & Viewport
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);

        // Smart TV Focus & Spatial Navigation
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setNeedInitialFocus(true);
        }
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setOffscreenPreRaster(true);
        }
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        // 3. Media & Video Streaming
        settings.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }

        // 4. Cache & Auto-Update
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // 5. Append Custom User Agent Identifier (Detects Smart TV / Leanback)
        String originalUa = settings.getUserAgentString();
        String tvTag = isTelevision() ? " SmartTV AndroidTV/1.0 Leanback" : " Mobile";
        settings.setUserAgentString(originalUa + " CinemaVerse-Android/1.0" + tvTag);

        // Client callbacks
        webView.setWebViewClient(new CinemaWebViewClient());
        webView.setWebChromeClient(new CinemaWebChromeClient());
        webView.addJavascriptInterface(new AndroidVoiceBridge(), "AndroidVoiceBridge");
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setData(Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    Toast.makeText(MainActivity.this, "Starting download...", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Download error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
        });
    }

    /**
     * Enhanced WebViewClient for auto-updates, loading states, and offline handling
     */
    private class CinemaWebViewClient extends WebViewClient {

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            progressBar.setVisibility(View.GONE);
            swipeRefresh.setRefreshing(false);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) {
                showErrorScreen();
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            // Handle binary downloads (.apk, .exe, .dmg, .AppImage) or download URLs by launching external browser/download manager
            if (url.endsWith(".apk") || url.endsWith(".exe") || url.endsWith(".dmg") || 
                url.endsWith(".AppImage") || url.endsWith(".deb") || url.contains("/download/") ||
                url.contains("github.com/SanyamVerma123/Cinema-Verse-Pro/releases")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    Toast.makeText(MainActivity.this, "Downloading file...", Toast.LENGTH_SHORT).show();
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
            // Keep all CinemaVerse and player mirrors inside the native WebView
            return false;
        }
    }

    private void showErrorScreen() {
        progressBar.setVisibility(View.GONE);
        swipeRefresh.setRefreshing(false);
        webView.setVisibility(View.GONE);
        errorUrlText.setText(getTargetUrl());
        errorLayout.setVisibility(View.VISIBLE);
    }

    /**
     * Enhanced WebChromeClient for Fullscreen 4K Video Playback
     */
    private class CinemaWebChromeClient extends WebChromeClient {

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            request.grant(request.getResources());
        }

        @Override
        public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
            Log.d("CinemaVerseJS", consoleMessage.message() + " [" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + "]");
            return true;
        }

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progressBar.setProgress(newProgress);
            if (newProgress == 100) {
                progressBar.setVisibility(View.GONE);
            }
        }

        @Override
        public void onShowCustomView(View view, CustomViewCallback callback) {
            if (customView != null) {
                onHideCustomView();
                return;
            }

            customView = view;
            customViewCallback = callback;
            originalOrientation = getRequestedOrientation();
            originalSystemUiVisibility = getWindow().getDecorView().getSystemUiVisibility();

            customViewContainer.addView(customView, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
            ));
            customViewContainer.setVisibility(View.VISIBLE);
            webView.setVisibility(View.GONE);
            swipeRefresh.setEnabled(false);

            // Enter Sticky Immersive Fullscreen Mode
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        }

        @Override
        public void onHideCustomView() {
            if (customView == null) return;

            customViewContainer.setVisibility(View.GONE);
            customViewContainer.removeView(customView);
            customView = null;
            if (customViewCallback != null) {
                customViewCallback.onCustomViewHidden();
                customViewCallback = null;
            }

            webView.setVisibility(View.VISIBLE);
            swipeRefresh.setEnabled(true);

            // Restore original UI and orientation
            getWindow().getDecorView().setSystemUiVisibility(originalSystemUiVisibility);
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            setRequestedOrientation(originalOrientation);
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            switch (event.getKeyCode()) {
                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_DPAD_DOWN:
                case KeyEvent.KEYCODE_DPAD_LEFT:
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                    if (webView != null && !webView.hasFocus()) {
                        webView.requestFocus();
                    }
                    break;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Forward Smart TV D-Pad & Remote Navigation directly into WebView
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_DPAD_DOWN:
            case KeyEvent.KEYCODE_DPAD_LEFT:
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                if (webView != null) {
                    if (!webView.hasFocus()) webView.requestFocus();
                    return webView.dispatchKeyEvent(event);
                }
                break;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_PLAY:
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
                if (webView != null) {
                    webView.evaluateJavascript("if (typeof togglePlayPause === 'function') togglePlayPause();", null);
                    return true;
                }
                break;
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                if (webView != null) {
                    webView.evaluateJavascript("if (typeof seekRelative === 'function') seekRelative(10);", null);
                    return true;
                }
                break;
            case KeyEvent.KEYCODE_MEDIA_REWIND:
                if (webView != null) {
                    webView.evaluateJavascript("if (typeof seekRelative === 'function') seekRelative(-10);", null);
                    return true;
                }
                break;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        // 1. If currently in fullscreen video, exit fullscreen video first
        if (customView != null) {
            WebChromeClient client = new CinemaWebChromeClient();
            client.onHideCustomView();
            return;
        }

        // Smart TV Back key routing for modals, search, and TV player
        if (isTelevision()) {
            if (webView != null) {
                webView.evaluateJavascript(
                    "(function(){" +
                    "  if (window.closeTvPlayer && document.getElementById('tv-player-overlay')?.classList.contains('active')) { window.closeTvPlayer(); return true; }" +
                    "  if (window.closeTvDetailsModal && document.getElementById('tv-details-modal')?.classList.contains('active')) { window.closeTvDetailsModal(); return true; }" +
                    "  if (window.switchTvTab && document.getElementById('tv-search-container')?.classList.contains('active')) { window.switchTvTab('home'); return true; }" +
                    "  if (window.closeDetailsModal && document.getElementById('details-modal')?.style.display === 'flex') { window.closeDetailsModal(); return true; }" +
                    "  return false;" +
                    "})()",
                    value -> {
                        if ("false".equals(value) || value == null) {
                            runOnUiThread(() -> {
                                if (webView.canGoBack()) {
                                    webView.goBack();
                                } else if (backPressedTime + 2000 > System.currentTimeMillis()) {
                                    super.onBackPressed();
                                } else {
                                    Toast.makeText(this, "Press back again to exit CinemaVerse", Toast.LENGTH_SHORT).show();
                                    backPressedTime = System.currentTimeMillis();
                                }
                            });
                        }
                    }
                );
                return;
            }
        }

        // 2. If webView can navigate back in browsing history
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        // 3. Double-tap back to exit
        if (backPressedTime + 2000 > System.currentTimeMillis()) {
            super.onBackPressed();
        } else {
            Toast.makeText(this, "Press back again to exit CinemaVerse", Toast.LENGTH_SHORT).show();
            backPressedTime = System.currentTimeMillis();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    public class AndroidVoiceBridge {
        @android.webkit.JavascriptInterface
        public void startVoiceSearch() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO}, REQUEST_RECORD_AUDIO_PERMISSION);
                        return;
                    }
                }
                launchVoiceSearchDialog();
            });
        }

        @android.webkit.JavascriptInterface
        public boolean isAvailable() {
            return true;
        }
    }

    private void launchVoiceSearchDialog() {
        try {
            Intent intent = new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT, "Say a movie name, series, actor, or genre...");
            startActivityForResult(intent, REQUEST_CODE_VOICE_SEARCH);
        } catch (Exception e) {
            Log.w("CinemaVerse", "Native voice recognition not available", e);
            Toast.makeText(this, "Voice recognition not available on this device", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_RECORD_AUDIO_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                launchVoiceSearchDialog();
            } else {
                Toast.makeText(this, "Microphone permission required for voice search", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_CODE_VOICE_SEARCH && resultCode == RESULT_OK && data != null) {
            java.util.ArrayList<String> matches = data.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS);
            if (matches != null && !matches.isEmpty()) {
                String spokenText = matches.get(0).replace("'", "\'");
                webView.evaluateJavascript("window.handleVoiceFinalResult && window.handleVoiceFinalResult('" + spokenText + "');", null);
            }
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
