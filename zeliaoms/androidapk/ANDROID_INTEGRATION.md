# Android App Integration Guide

A quick start guide for Android developers integrating with the ZELIA API.

## 🎯 Quick Start

### 1. Setup API Client

```kotlin
// Create Retrofit instance
val retrofit = Retrofit.Builder()
    .baseUrl("http://your-domain.com/api/")
    .addConverterFactory(GsonConverterFactory.create())
    .client(okHttpClient)
    .build()

val apiService = retrofit.create(ApiService::class.java)
```

### 2. Define API Service Interface

```kotlin
interface ApiService {
    // Authentication
    @POST("auth/login/")
    suspend fun login(@Body credentials: LoginRequest): LoginResponse
    
    @POST("auth/logout/")
    suspend fun logout(): LogoutResponse
    
    // Products
    @GET("products/")
    suspend fun getProducts(
        @Query("page") page: Int = 1,
        @Query("category") category: Int? = null
    ): ProductsResponse
    
    @GET("products/{id}/")
    suspend fun getProductDetail(@Path("id") id: Int): Product
    
    @GET("products/{id}/price_by_category/")
    suspend fun getProductPrice(
        @Path("id") id: Int,
        @Query("category") category: String
    ): PriceResponse
    
    // Customers
    @GET("customers/")
    suspend fun getCustomers(): CustomersResponse
    
    @POST("customers/")
    suspend fun createCustomer(@Body customer: CreateCustomerRequest): Customer
    
    // Orders
    @GET("orders/")
    suspend fun getOrders(): OrdersResponse
    
    @POST("orders/create_order/")
    suspend fun createOrder(@Body order: CreateOrderRequest): Order
    
    @PUT("orders/{id}/update_status/")
    suspend fun updateOrderStatus(
        @Path("id") id: Int,
        @Body statusUpdate: StatusUpdateRequest
    ): Order
    
    // Quotes
    @GET("quotes/")
    suspend fun getQuotes(): QuotesResponse
    
    @POST("quotes/create_quote/")
    suspend fun createQuote(@Body quote: CreateQuoteRequest): Quote
    
    // Payments
    @POST("payments/add_payment/")
    suspend fun addPayment(@Body payment: PaymentRequest): Payment
}
```

### 3. Add Token Authentication

```kotlin
class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        val token = tokenStore.getToken()
        if (token.isNotEmpty()) {
            val authenticatedRequest = originalRequest.newBuilder()
                .header("Authorization", "Token $token")
                .build()
            return chain.proceed(authenticatedRequest)
        }
        
        return chain.proceed(originalRequest)
    }
}

// Add to OkHttpClient
val okHttpClient = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor(tokenStore))
    .build()
```

### 4. Create Data Classes

```kotlin
// Login
data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val user: UserProfile,
    val message: String
)

// Products
data class Product(
    val id: Int,
    val name: String,
    val description: String,
    val category_name: String,
    val retail_price: Double,
    val status: String,
    val total_stock: Int,
    val image_url: String?
)

data class ProductsResponse(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<Product>
)

// Orders
data class CreateOrderRequest(
    val customer_id: Int,
    val customer_category: String,
    val vat_variation: String,
    val address: String,
    val phone: String,
    val store: String,
    val delivery_fee: Double,
    val items: List<OrderItemRequest>
)

data class OrderItemRequest(
    val product_id: Int,
    val quantity: Int,
    val unit_price: Double,
    val variance: Double = 0.0
)

data class Order(
    val id: Int,
    val customer: Int,
    val customer_name: String,
    val total_amount: Double,
    val amount_paid: Double,
    val balance: Double,
    val delivery_status: String,
    val paid_status: String,
    val order_items: List<OrderItem>,
    val created_at: String,
    val updated_at: String
)

data class OrderItem(
    val id: Int,
    val product: Int,
    val product_name: String,
    val quantity: Int,
    val unit_price: Double,
    val line_total: Double
)
```

### 5. Implement Authentication Flow

```kotlin
class AuthRepository(
    private val apiService: ApiService,
    private val tokenStore: TokenStore
) {
    suspend fun login(username: String, password: String): Result<LoginResponse> {
        return try {
            val response = apiService.login(LoginRequest(username, password))
            tokenStore.saveToken(response.token)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun logout(): Result<LogoutResponse> {
        return try {
            val response = apiService.logout()
            tokenStore.clearToken()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun isLoggedIn(): Boolean {
        return tokenStore.getToken().isNotEmpty()
    }
}
```

### 6. Using with ViewModel

```kotlin
class ProductViewModel(
    private val apiService: ApiService
) : ViewModel() {
    
    private val _products = MutableLiveData<List<Product>>()
    val products: LiveData<List<Product>> = _products
    
    private val _loading = MutableLiveData<Boolean>()
    val loading: LiveData<Boolean> = _loading
    
    private val _error = MutableLiveData<String>()
    val error: LiveData<String> = _error
    
    fun getProducts() {
        viewModelScope.launch {
            try {
                _loading.value = true
                val response = apiService.getProducts()
                _products.value = response.results
            } catch (e: Exception) {
                _error.value = e.message
            } finally {
                _loading.value = false
            }
        }
    }
}
```

### 7. Create Order Example

```kotlin
suspend fun createOrder(
    customerId: Int,
    items: List<OrderItemRequest>
): Result<Order> {
    return try {
        val orderRequest = CreateOrderRequest(
            customer_id = customerId,
            customer_category = "wholesale",
            vat_variation = "with_vat",
            address = "Delivery Address",
            phone = "0741484426",
            store = "mcdave",
            delivery_fee = 500.0,
            items = items
        )
        
        val order = apiService.createOrder(orderRequest)
        Result.success(order)
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

### 8. Error Handling

```kotlin
sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val exception: Exception) : ApiResult<Nothing>()
    object Loading : ApiResult<Nothing>()
}

// Convert API response to sealed class
fun <T> apiCall(block: suspend () -> T): Flow<ApiResult<T>> = flow {
    emit(ApiResult.Loading)
    try {
        emit(ApiResult.Success(block()))
    } catch (e: HttpException) {
        emit(ApiResult.Error(Exception("HTTP Error: ${e.code()}")))
    } catch (e: Exception) {
        emit(ApiResult.Error(e))
    }
}
```

### 9. Token Storage

```kotlin
class TokenStore(private val context: Context) {
    private val sharedPreferences = context.getSharedPreferences(
        "auth_preferences",
        Context.MODE_PRIVATE
    )
    
    fun saveToken(token: String) {
        sharedPreferences.edit()
            .putString("auth_token", token)
            .apply()
    }
    
    fun getToken(): String {
        return sharedPreferences.getString("auth_token", "") ?: ""
    }
    
    fun clearToken() {
        sharedPreferences.edit()
            .remove("auth_token")
            .apply()
    }
}
```

### 10. Network Error Handling

```kotlin
// Add logging interceptor (for debugging)
val loggingInterceptor = HttpLoggingInterceptor().apply {
    level = HttpLoggingInterceptor.Level.BODY
}

// Add timeout configuration
val okHttpClient = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .addInterceptor(AuthInterceptor(tokenStore))
    .addInterceptor(loggingInterceptor)
    .build()
```

## 📦 Gradle Dependencies

```gradle
dependencies {
    // Retrofit
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    implementation 'com.squareup.okhttp3:logging-interceptor:4.10.0'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.4'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.6.4'
    
    // Lifecycle
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.6.1'
    implementation 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.1'
    implementation 'androidx.lifecycle:lifecycle-livedata-ktx:2.6.1'
    
    // Gson
    implementation 'com.google.code.gson:gson:2.10'
}
```

## 🔐 Security Best Practices

1. **Never hardcode credentials**
   ```kotlin
   // ❌ Bad
   const val API_URL = "http://localhost:8000/api/"
   
   // ✅ Good - Use BuildConfig or config files
   const val API_URL = BuildConfig.API_URL
   ```

2. **Secure Token Storage**
   ```kotlin
   // ✅ Use EncryptedSharedPreferences
   val masterKey = MasterKey.Builder(context)
       .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
       .build()
   
   val encryptedSharedPreferences = EncryptedSharedPreferences.create(
       context,
       "secret_shared_prefs",
       masterKey,
       EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
       EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
   )
   ```

3. **HTTPS Only**
   ```kotlin
   // Enforce HTTPS in production
   if (BuildConfig.DEBUG) {
       apiUrl = "http://localhost:8000/"
   } else {
       apiUrl = "https://zeliaoms.mcdave.co.ke/"
   }
   ```

## 🧪 Testing

```kotlin
// Test login
@Test
fun testLogin() = runBlocking {
    val mockApiService = mock<ApiService>()
    val expectedResponse = LoginResponse(
        token = "test_token",
        user = mockUser,
        message = "Login successful"
    )
    
    whenever(mockApiService.login(any())).thenReturn(expectedResponse)
    
    val result = authRepository.login("test", "test")
    
    assert(result.isSuccess)
    assertEquals("test_token", result.getOrNull()?.token)
}
```

## 📱 UI Integration Pattern

```kotlin
// Typical Activity/Fragment pattern
class ProductListFragment : Fragment() {
    private val viewModel: ProductViewModel by viewModels()
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        viewModel.products.observe(viewLifecycleOwner) { products ->
            updateUI(products)
        }
        
        viewModel.loading.observe(viewLifecycleOwner) { isLoading ->
            showLoadingSpinner(isLoading)
        }
        
        viewModel.error.observe(viewLifecycleOwner) { error ->
            showError(error)
        }
        
        viewModel.getProducts()
    }
}
```

## 🚀 Deployment Notes

- Use production API URL: `https://zeliaoms.mcdave.co.ke/api/`
- Configure API timeout appropriately for slow networks
- Implement offline caching for better UX
- Handle network errors gracefully
- Implement automatic token refresh if needed

---

**Version:** 1.0  
**Last Updated:** March 10, 2026
