const { body, validationResult } = require('express-validator');

async function testPasswordValidation() {
  console.log('🔍 Testing Password Validation');
  console.log('');

  const testPassword = 'TestPass123!';
  console.log('Test password:', testPassword);

  // Test the exact regex from the route
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
  
  console.log('Password regex:', passwordRegex.toString());
  console.log('Regex test result:', passwordRegex.test(testPassword));

  // Test each requirement individually
  console.log('\nIndividual checks:');
  console.log('Has lowercase:', /(?=.*[a-z])/.test(testPassword));
  console.log('Has uppercase:', /(?=.*[A-Z])/.test(testPassword));
  console.log('Has digit:', /(?=.*\d)/.test(testPassword));
  console.log('Has special char:', /(?=.*[@$!%*?&])/.test(testPassword));
  console.log('Only allowed chars:', /^[A-Za-z\d@$!%*?&]+$/.test(testPassword));

  // Test with express-validator
  console.log('\nTesting with express-validator:');
  
  // Mock request object
  const req = {
    body: {
      email: 'test@example.com',
      password: testPassword,
      firstName: 'Test',
      lastName: 'User',
      organizationId: 'test-org-id',
      role: 'PATIENT'
    }
  };

  // Create validation chain
  const validations = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/),
    body('firstName').trim().isLength({ min: 1 }),
    body('lastName').trim().isLength({ min: 1 }),
    body('organizationId').optional().isString(),
    body('inviteCode').optional().isString()
  ];

  // Run validations
  for (const validation of validations) {
    await validation.run(req);
  }

  const errors = validationResult(req);
  
  if (errors.isEmpty()) {
    console.log('✅ All validations passed');
  } else {
    console.log('❌ Validation errors:');
    console.log(JSON.stringify(errors.array(), null, 2));
  }
}

testPasswordValidation();