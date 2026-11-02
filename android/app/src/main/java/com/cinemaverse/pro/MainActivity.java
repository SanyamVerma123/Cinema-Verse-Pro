package com.cinemaverse.pro;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
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
        return preferences.getString(KEY_SERVER_URL, defaultUrl);
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

    private void setupSwipeRefresh() {
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

        // 3. Media & Video Streaming
        settings.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }

        // 4. Cache & Auto-Update
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // 5. Append Custom User Agent Identifier
        String originalUa = settings.getUserAgentString();
        settings.setUserAgentString(originalUa + " CinemaVerse-Android/1.0 (Auto-Updating Shell)");

        // Client callbacks
        webView.setWebViewClient(new CinemaWebViewClient());
        webView.setWebChromeClient(new CinemaWebChromeClient());
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
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Smart TV D-Pad Remote Navigation Support
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
                if (webView != null && webView.hasFocus()) {
                    return super.onKeyDown(keyCode, event);
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

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
