/**
 * Automated REST API Verification Test Suite for QuickBite Food Delivery App
 * Tests all 16+ endpoints and full CRUD operations against the live Express + MongoDB backend.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

let testFoodId = null;
let testOrderId = null;
let testReviewId = null;
let passedTests = 0;
let totalTests = 0;

async function assertApi(name, method, endpoint, options = {}, expectedStatus = 200) {
  totalTests++;
  const url = `${BASE_URL}${endpoint}`;
  try {
    const fetchOptions = {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };
    if (fetchOptions.body && typeof fetchOptions.body === 'object') {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (response.status === expectedStatus) {
      passedTests++;
      console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${name} (${method} ${endpoint}) -> ${response.status}`);
      return { success: true, data };
    } else {
      console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${name} (${method} ${endpoint}) -> Expected ${expectedStatus}, Got ${response.status}`);
      console.error('    Error details:', data);
      return { success: false, data };
    }
  } catch (err) {
    console.error(`  \x1b[31m✖ [ERROR]\x1b[0m ${name} (${method} ${endpoint}) -> Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🍔 Starting QuickBite REST API Verification Suite');
  console.log(`🌐 Target: ${BASE_URL}`);
  console.log('======================================================\n');

  // 1. Health & Seeding
  console.log('--- System & Health ---');
  await assertApi('Server & DB Health Check', 'GET', '/api/stats/health', {}, 200);

  console.log('\n--- Data Seeding ---');
  await assertApi('Seed Initial Demo Menu & Orders', 'POST', '/api/stats/seed', {}, 200);

  console.log('\n--- Business Overview ---');
  await assertApi('Fetch Business Metrics & Stats', 'GET', '/api/stats', {}, 200);

  // 2. Food Menu CRUD
  console.log('\n--- Food Menu CRUD Endpoints ---');
  await assertApi('List All Food Items (Read)', 'GET', '/api/foods', {}, 200);

  const createFoodRes = await assertApi(
    'Add New Dish to Menu (Create)',
    'POST',
    '/api/foods',
    {
      body: {
        name: `Automated Test Pizza ${Date.now().toString().slice(-4)}`,
        description: 'Crisp woodfired crust topped with buffalo mozzarella and cherry tomatoes',
        price: 399,
        category: 'Pizza',
        isVeg: true,
        preparationTime: '20 mins',
      },
    },
    201
  );

  if (createFoodRes.success && createFoodRes.data?.data?._id) {
    testFoodId = createFoodRes.data.data._id;
  }

  if (testFoodId) {
    await assertApi('Get Single Dish Details (Read)', 'GET', `/api/foods/${testFoodId}`, {}, 200);

    await assertApi(
      'Update Dish Details & Pricing (Update)',
      'PUT',
      `/api/foods/${testFoodId}`,
      {
        body: {
          price: 429,
          description: 'Enhanced recipe with fresh basil and cold pressed olive oil',
        },
      },
      200
    );

    await assertApi(
      'Toggle Dish Availability (Update)',
      'PATCH',
      `/api/foods/${testFoodId}/availability`,
      {
        body: { isAvailable: false },
      },
      200
    );
  }

  // 3. Orders CRUD
  console.log('\n--- Orders CRUD Endpoints ---');
  await assertApi('List All Food Orders (Read)', 'GET', '/api/orders', {}, 200);

  if (testFoodId) {
    const createOrderRes = await assertApi(
      'Place New Food Delivery Order (Create)',
      'POST',
      '/api/orders',
      {
        body: {
          customerName: 'Siddharth Nair',
          customerPhone: '+91 98765 22334',
          deliveryAddress: 'Flat 502, Skyline Residency, Koramangala',
          paymentMethod: 'UPI / Online',
          items: [
            {
              foodItem: testFoodId,
              name: 'Automated Test Pizza',
              price: 429,
              quantity: 2,
            },
          ],
        },
      },
      201
    );

    if (createOrderRes.success && createOrderRes.data?.data?._id) {
      testOrderId = createOrderRes.data.data._id;
    }

    if (testOrderId) {
      await assertApi('Get Single Order Tracking Status (Read)', 'GET', `/api/orders/${testOrderId}`, {}, 200);

      await assertApi(
        'Update Order Status (Update)',
        'PATCH',
        `/api/orders/${testOrderId}/status`,
        {
          body: { status: 'Preparing' },
        },
        200
      );
    }
  }

  // 4. Reviews & Ratings
  console.log('\n--- Reviews & Ratings Endpoints ---');
  if (testFoodId) {
    const reviewRes = await assertApi(
      'Submit Customer Review & Rating (Create)',
      'POST',
      '/api/reviews',
      {
        body: {
          customerName: 'Ananya Roy',
          foodItem: testFoodId,
          rating: 5,
          comment: 'Incredible flavor and arrived piping hot!',
        },
      },
      201
    );

    if (reviewRes.success && reviewRes.data?.data?._id) {
      testReviewId = reviewRes.data.data._id;
    }

    await assertApi('Get Reviews for Dish (Read)', 'GET', `/api/reviews/food/${testFoodId}`, {}, 200);
  }

  // 5. Cleanup / Deletions
  console.log('\n--- Delete Operations (Cleanup) ---');
  if (testReviewId) {
    await assertApi('Delete Customer Review (Delete)', 'DELETE', `/api/reviews/${testReviewId}`, {}, 200);
  }
  if (testOrderId) {
    await assertApi('Cancel / Delete Order (Delete)', 'DELETE', `/api/orders/${testOrderId}`, {}, 200);
  }
  if (testFoodId) {
    await assertApi('Remove Dish from Menu (Delete)', 'DELETE', `/api/foods/${testFoodId}`, {}, 200);
  }

  // Summary
  console.log('\n======================================================');
  console.log(`📊 Test Summary: ${passedTests} / ${totalTests} tests passed`);
  if (passedTests === totalTests) {
    console.log('🎉 \x1b[32mALL FOOD DELIVERY REST APIS & CRUD OPERATIONS VERIFIED!\x1b[0m');
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.error('⚠️ \x1b[31mSOME TESTS FAILED!\x1b[0m');
    console.log('======================================================\n');
    process.exit(1);
  }
}

runAllTests();
