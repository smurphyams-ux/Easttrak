import { Router } from 'express';
import { db } from '../../lib/db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { route } = req.query;
    
    let query = `
      SELECT 
        d.id,
        d.container_number,
        d.customer_id,
        c.name as customer_name,
        d.delivery_address,
        d.latitude,
        d.longitude,
        d.status,
        d.scheduled_date,
        d.delivered_date,
        d.driver_id,
        dr.name as driver_name,
        d.notes
      FROM deliveries d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN drivers dr ON d.driver_id = dr.id
      WHERE d.scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
    `;
    
    const params: any[] = [];
    
    if (route && route !== 'all') {
      query += ' AND d.route_id = $1';
      params.push(route);
    }
    
    query += ' ORDER BY d.scheduled_date, d.id';
    
    const result = await db.query(query, params);
    
    const deliveries = result.rows.map(row => ({
      id: row.id,
      containerNumber: row.container_number,
      customerId: row.customer_id,
      customerName: row.customer_name,
      deliveryAddress: row.delivery_address,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      status: row.status,
      scheduledDate: row.scheduled_date,
      deliveredDate: row.delivered_date,
      driverId: row.driver_id,
      driverName: row.driver_name,
      notes: row.notes,
    }));
    
    res.json(deliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

export default router;
