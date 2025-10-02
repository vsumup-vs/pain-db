const request = require('supertest');
const { app } = require('../../index');

describe('MetricDefinition Controller', () => {
  let testMetricDefinition;

  beforeEach(async () => {
    // Clean up before each test
    await global.prisma.metricDefinition.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test
    await global.prisma.metricDefinition.deleteMany({});
  });

  describe('POST /api/metric-definitions', () => {
    it('should create a new metric definition successfully', async () => {
      const metricData = {
        key: 'pain_level_test',
        displayName: 'Pain Level Test',
        valueType: 'numeric',
        unit: 'scale',
        minValue: 0,
        maxValue: 10,
        description: 'Test pain level metric'
      };

      const response = await request(app)
        .post('/api/metric-definitions')
        .send(metricData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        key: 'pain_level_test',
        displayName: 'Pain Level Test',
        valueType: 'numeric',
        unit: 'scale'
      });
    });

    it('should return error for duplicate key', async () => {
      const metricData = {
        key: 'duplicate_key',
        displayName: 'Duplicate Test',
        valueType: 'numeric'
      };

      // Create first metric
      await request(app)
        .post('/api/metric-definitions')
        .send(metricData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/metric-definitions')
        .send(metricData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/metric-definitions')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/metric-definitions', () => {
    beforeEach(async () => {
      // Create test data
      await global.prisma.metricDefinition.createMany({
        data: [
          {
            key: 'pain_level_1',
            displayName: 'Pain Level 1',
            valueType: 'numeric',
            unit: 'scale'
          },
          {
            key: 'pain_level_2',
            displayName: 'Pain Level 2',
            valueType: 'numeric',
            unit: 'scale'
          }
        ]
      });
    });

    it('should get all metric definitions with pagination', async () => {
      const response = await request(app)
        .get('/api/metric-definitions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2
      });
    });

    it('should filter by search term', async () => {
      const response = await request(app)
        .get('/api/metric-definitions?search=Pain Level 1')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].displayName).toBe('Pain Level 1');
    });

    it('should filter by value type', async () => {
      const response = await request(app)
        .get('/api/metric-definitions?valueType=numeric')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(m => m.valueType === 'numeric')).toBe(true);
    });
  });

  describe('GET /api/metric-definitions/:id', () => {
    beforeEach(async () => {
      testMetricDefinition = await global.prisma.metricDefinition.create({
        data: {
          key: 'test_metric',
          displayName: 'Test Metric',
          valueType: 'numeric',
          unit: 'scale'
        }
      });
    });

    it('should get metric definition by ID', async () => {
      const response = await request(app)
        .get(`/api/metric-definitions/${testMetricDefinition.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testMetricDefinition.id);
    });

    it('should return 404 for non-existent metric', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/metric-definitions/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/metric-definitions/:id', () => {
    beforeEach(async () => {
      testMetricDefinition = await global.prisma.metricDefinition.create({
        data: {
          key: 'update_test',
          displayName: 'Update Test',
          valueType: 'numeric',
          unit: 'scale'
        }
      });
    });

    it('should update metric definition successfully', async () => {
      const updateData = {
        displayName: 'Updated Test Metric',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/metric-definitions/${testMetricDefinition.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.displayName).toBe('Updated Test Metric');
    });

    it('should return 404 for non-existent metric', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .put(`/api/metric-definitions/${nonExistentId}`)
        .send({ displayName: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/metric-definitions/:id', () => {
    beforeEach(async () => {
      testMetricDefinition = await global.prisma.metricDefinition.create({
        data: {
          key: 'delete_test',
          displayName: 'Delete Test',
          valueType: 'numeric',
          unit: 'scale'
        }
      });
    });

    it('should delete metric definition successfully', async () => {
      const response = await request(app)
        .delete(`/api/metric-definitions/${testMetricDefinition.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent metric', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .delete(`/api/metric-definitions/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/metric-definitions/stats', () => {
    beforeEach(async () => {
      await global.prisma.metricDefinition.createMany({
        data: [
          {
            key: 'pain_metric_1',
            displayName: 'Pain Metric 1',
            valueType: 'numeric',
            unit: 'scale'
          },
          {
            key: 'text_metric_1',
            displayName: 'Text Metric 1',
            valueType: 'text'
          }
        ]
      });
    });

    it('should get metric definition statistics', async () => {
      const response = await request(app)
        .get('/api/metric-definitions/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byValueType');
      expect(response.body.data.total).toBe(2);
    });
  });

  describe('POST /api/metric-definitions/validate', () => {
    beforeEach(async () => {
      testMetricDefinition = await global.prisma.metricDefinition.create({
        data: {
          key: 'validation_test',
          displayName: 'Validation Test',
          valueType: 'numeric',
          unit: 'scale',
          minValue: 0,
          maxValue: 10
        }
      });
    });

    it('should validate metric value successfully', async () => {
      const validationData = {
        metricDefinitionId: testMetricDefinition.id,
        value: '5'
      };

      const response = await request(app)
        .post('/api/metric-definitions/validate')
        .send(validationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
    });

    it('should return validation error for invalid value', async () => {
      const validationData = {
        metricDefinitionId: testMetricDefinition.id,
        value: '15' // Outside range 0-10
      };

      const response = await request(app)
        .post('/api/metric-definitions/validate')
        .send(validationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toBeDefined();
    });
  });
});