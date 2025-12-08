import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create demo user (Vehicle Owner)
  const hashedPassword = await bcrypt.hash('Demo123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@autosentry.com' },
    update: {},
    create: {
      email: 'demo@autosentry.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      phone: '+1234567890',
      role: 'CUSTOMER'  // Vehicle Owner role
    }
  });
  console.log('✅ Vehicle Owner created:', user.email);

  // Create admin user (Fleet Manager)
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@autosentry.com' },
    update: {},
    create: {
      email: 'admin@autosentry.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Manager',
      phone: '+1987654321',
      role: 'ADMIN'  // Admin role
    }
  });
  console.log('✅ Admin created:', admin.email);

  // Create demo vehicles
  const vehiclesData = [
    { vin: 'WBA3A5C51DF123456', make: 'BMW', model: '328i', year: 2023, mileage: 15000, color: 'Alpine White', licensePlate: 'BMW-001' },
    { vin: 'WVWZZZ3CZWE123456', make: 'Volkswagen', model: 'ID.4', year: 2024, mileage: 8000, color: 'Moonstone Grey', licensePlate: 'VW-002' },
    { vin: '5YJ3E1EA5LF123456', make: 'Tesla', model: 'Model 3', year: 2023, mileage: 22000, color: 'Pearl White', licensePlate: 'TSLA-03' },
    { vin: '1HGCV1F34LA123456', make: 'Honda', model: 'Accord', year: 2022, mileage: 35000, color: 'Crystal Black', licensePlate: 'HND-004' },
    { vin: 'JTDKN3DU5A0123456', make: 'Toyota', model: 'Prius', year: 2024, mileage: 5000, color: 'Sea Glass Pearl', licensePlate: 'TOY-005' }
  ];

  const vehicles: any[] = [];
  for (const v of vehiclesData) {
    const vehicle = await prisma.vehicle.upsert({
      where: { vin: v.vin },
      update: {},
      create: { ...v, userId: user.id }
    });
    vehicles.push(vehicle);
  }
  console.log('✅ Created', vehicles.length, 'vehicles');

  // Create telemetry readings for each vehicle
  for (const vehicle of vehicles) {
    await prisma.telemetryReading.create({
      data: {
        vehicleId: vehicle.id,
        engineTemp: 85 + Math.random() * 20,
        oilPressure: 30 + Math.random() * 15,
        oilLevel: 0.8 + Math.random() * 0.2,
        batteryVoltage: 12.4 + Math.random() * 1.2,
        batteryHealth: 85 + Math.random() * 15,
        fuelLevel: 40 + Math.random() * 50,
        coolantTemp: 85 + Math.random() * 15,
        coolantLevel: 0.9 + Math.random() * 0.1,
        tirePressureFl: 31 + Math.random() * 2,
        tirePressureFr: 31 + Math.random() * 2,
        tirePressureRl: 30 + Math.random() * 2,
        tirePressureRr: 30 + Math.random() * 2,
        brakePadFront: 0.5 + Math.random() * 0.5,
        brakePadRear: 0.6 + Math.random() * 0.4,
        speed: Math.floor(Math.random() * 80),
        rpm: 1500 + Math.floor(Math.random() * 2000),
        mileage: vehicle.mileage
      }
    });
  }
  console.log('✅ Created telemetry readings');

  // Create AI predictions for first vehicle
  const mainVehicle = vehicles[0];
  await prisma.prediction.createMany({
    data: [
      { 
        vehicleId: mainVehicle.id, 
        component: 'Brake Pads', 
        predictedIssue: 'Brake pad wear exceeding safe limits',
        confidence: 0.89, 
        severity: 'HIGH', 
        estimatedDays: 30,
        estimatedCost: 350,
        recommendations: ['Schedule brake pad replacement', 'Avoid heavy braking until serviced']
      },
      { 
        vehicleId: mainVehicle.id, 
        component: 'Battery', 
        predictedIssue: 'Battery capacity degradation detected',
        confidence: 0.82, 
        severity: 'MEDIUM', 
        estimatedDays: 90,
        estimatedCost: 200,
        recommendations: ['Monitor battery health', 'Consider replacement in 3 months']
      },
      { 
        vehicleId: mainVehicle.id, 
        component: 'Air Filter', 
        predictedIssue: 'Air filter clogging affecting performance',
        confidence: 0.78, 
        severity: 'LOW', 
        estimatedDays: 60,
        estimatedCost: 50,
        recommendations: ['Replace air filter at next service']
      },
      { 
        vehicleId: vehicles[1].id, 
        component: 'Transmission', 
        predictedIssue: 'Transmission fluid degradation',
        confidence: 0.85, 
        severity: 'MEDIUM', 
        estimatedDays: 45,
        estimatedCost: 180,
        recommendations: ['Schedule transmission fluid change']
      }
    ]
  });
  console.log('✅ Created AI predictions');

  // Create alerts
  await prisma.alert.createMany({
    data: [
      { 
        vehicleId: mainVehicle.id, 
        type: 'PREDICTION', 
        severity: 'CRITICAL', 
        title: 'Brake Pad Wear Detected', 
        message: 'Front brake pads are worn to 15%. Replacement recommended within 30 days to ensure safe braking performance.',
        isRead: false 
      },
      { 
        vehicleId: mainVehicle.id, 
        type: 'MAINTENANCE_DUE', 
        severity: 'WARNING', 
        title: 'Oil Change Due', 
        message: 'Vehicle has exceeded recommended oil change interval by 500 miles. Schedule service soon.',
        isRead: false 
      },
      { 
        vehicleId: mainVehicle.id, 
        type: 'TELEMETRY_ANOMALY', 
        severity: 'INFO', 
        title: 'Tire Pressure Low', 
        message: 'Rear left tire pressure is 28 PSI, below recommended 32 PSI. Check for leaks.',
        isRead: true 
      },
      { 
        vehicleId: vehicles[2].id, 
        type: 'PREDICTION', 
        severity: 'ERROR', 
        title: 'Battery Health Warning', 
        message: 'Battery degradation detected. Current capacity at 78%. Consider battery service.',
        isRead: false 
      }
    ]
  });
  console.log('✅ Created alerts');

  // Create appointments (need serviceCenterId)
  // First create a service center
  const serviceCenterId = 'sc-main-001';
  const serviceCenter = await prisma.serviceCenter.upsert({
    where: { id: serviceCenterId },
    update: {},
    create: {
      id: serviceCenterId,
      name: 'AutoSentry Main Service Center',
      address: '123 Auto Drive',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      phone: '+1-555-AUTO-FIX',
      email: 'service@autosentry.com',
      operatingHours: { mon: '8-18', tue: '8-18', wed: '8-18', thu: '8-18', fri: '8-18', sat: '9-14' },
      services: ['Oil Change', 'Brake Service', 'Diagnostics', 'Tire Service', 'Battery Replacement'],
      bayCount: 8
    }
  });
  console.log('✅ Created service center');

  await prisma.appointment.createMany({
    data: [
      { 
        userId: user.id, 
        vehicleId: mainVehicle.id,
        serviceCenterId: serviceCenter.id,
        serviceType: 'PREVENTIVE', 
        scheduledDate: new Date(Date.now() + 7*24*60*60*1000),
        scheduledTime: '10:00',
        status: 'PENDING', 
        services: ['Brake Pad Replacement'],
        notes: 'Brake pad replacement - Front axle', 
        estimatedCost: 350,
        duration: 120
      },
      { 
        userId: user.id, 
        vehicleId: mainVehicle.id,
        serviceCenterId: serviceCenter.id, 
        serviceType: 'DIAGNOSTIC', 
        scheduledDate: new Date(Date.now() + 14*24*60*60*1000),
        scheduledTime: '14:00',
        status: 'CONFIRMED', 
        services: ['Full Diagnostic Scan'],
        notes: 'Full vehicle diagnostic scan', 
        estimatedCost: 150,
        duration: 60
      },
      { 
        userId: user.id, 
        vehicleId: vehicles[1].id,
        serviceCenterId: serviceCenter.id,
        serviceType: 'PREVENTIVE', 
        scheduledDate: new Date(Date.now() + 21*24*60*60*1000),
        scheduledTime: '09:00',
        status: 'PENDING', 
        services: ['10K Mile Service', 'Oil Change', 'Filter Replacement'],
        notes: 'Scheduled maintenance - 10,000 mile service', 
        estimatedCost: 450,
        duration: 180
      }
    ]
  });
  console.log('✅ Created appointments');

  // Create customer feedback
  await prisma.feedback.createMany({
    data: [
      { 
        userId: user.id, 
        type: 'SERVICE_RATING', 
        rating: 5, 
        comment: 'Excellent service! The AI predictions caught a brake issue before it became dangerous. Very impressed with the technology.',
        sentiment: 'VERY_POSITIVE', 
        categories: ['service-quality', 'ai-accuracy', 'safety'],
        npsScore: 10
      },
      { 
        userId: user.id, 
        type: 'SERVICE_RATING', 
        rating: 4, 
        comment: 'Good experience overall. Quick turnaround time on the oil change. The digital twin visualization is really cool!',
        sentiment: 'POSITIVE', 
        categories: ['service-quality', 'timeliness', 'technology'],
        npsScore: 8
      },
      { 
        userId: user.id, 
        type: 'COMPLIMENT', 
        rating: 5, 
        comment: 'Love the real-time telemetry feature. I can monitor my car from anywhere. The predictions are surprisingly accurate.',
        sentiment: 'VERY_POSITIVE', 
        categories: ['app-features', 'user-experience'],
        npsScore: 9
      }
    ]
  });
  console.log('✅ Created customer feedback');

  console.log('\n🎉 Demo data seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Login Email: demo@autosentry.com');
  console.log('🔑 Password: Demo123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ Seed completed, database disconnected');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
