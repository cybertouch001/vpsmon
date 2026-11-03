import java.util.Properties
plugins { id("com.android.application") }
// Release signing comes from a properties file kept OUTSIDE this repo: FF_KEYSTORE_PROPS=/path/signing.properties
val signingProps = Properties().apply { val p = System.getenv("FF_KEYSTORE_PROPS"); if (p != null && file(p).exists()) file(p).inputStream().use { load(it) } }
android {
    namespace = "bot.tab.sites.facefang"
    compileSdk = 35
    defaultConfig { applicationId = "bot.tab.sites.facefang"; minSdk = 24; targetSdk = 35; versionCode = 2; versionName = "1.0.1" }
    signingConfigs { create("release") { if (signingProps.isNotEmpty()) { storeFile = file(signingProps.getProperty("storeFile")); storePassword = signingProps.getProperty("storePassword"); keyAlias = signingProps.getProperty("keyAlias"); keyPassword = signingProps.getProperty("keyPassword") } } }
    buildTypes { release { isMinifyEnabled = false; if (signingProps.isNotEmpty()) signingConfig = signingConfigs.getByName("release") } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    lint { abortOnError = false; checkReleaseBuilds = false }
}
dependencies { implementation("androidx.core:core:1.13.1") }
