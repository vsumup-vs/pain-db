// Temporary optimized version of getOverallClinicianStats
const optimizedClinicianStats = `
const getOverallClinicianStats = async (req, res) => {
  try {
    // Use faster queries
    const [total, activeCountResult, specializationStats, departmentStats] = await Promise.all([
      prisma.clinician.count(),
      // Use raw SQL for better performance
      prisma.$queryRaw\`
        SELECT COUNT(DISTINCT c.id) as count
        FROM "Clinician" c
        INNER JOIN "Enrollment" e ON c.id = e."clinicianId"
        WHERE e.status = 'active'
      \`,
      prisma.clinician.groupBy({
        by: ['specialization'],
        _count: true
      }),
      prisma.clinician.groupBy({
        by: ['department'],
        _count: true,
        where: {
          department: {
            not: null
          }
        }
      })
    ]);

    const activeCount = parseInt(activeCountResult[0].count);

    const bySpecialization = specializationStats.reduce((acc, stat) => {
      acc[stat.specialization] = stat._count;
      return acc;
    }, {});

    const byDepartment = departmentStats.reduce((acc, stat) => {
      acc[stat.department] = stat._count;
      return acc;
    }, {});

    res.json({
      data: {
        total,
        active: activeCount,
        bySpecialization,
        byDepartment
      }
    });
  } catch (error) {
    console.error('Error fetching overall clinician stats:', error);
    res.status(500).json({
      error: 'Internal server error while fetching clinician statistics'
    });
  }
};
`;

console.log('Optimized clinician stats function:');
console.log(optimizedClinicianStats);