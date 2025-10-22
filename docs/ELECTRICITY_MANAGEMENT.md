# Electricity Bills Management System

## Overview
Automated system to track and analyze electricity bills, correlating power consumption with production output for business optimization.

## 🎯 Key Features

### 1. **PDF Upload & Auto-Parsing**
- Upload electricity bill PDF/text file
- Automatically extracts all key metrics:
  - Bill number, date, month
  - Consumer details
  - KWH/KVAH consumption
  - Demand charges, energy charges
  - TOD (Time of Day) charges
  - FPPCA charges
  - Arrears and penalties
  - Power factor

### 2. **Cost Analytics**
- **Total consumption tracking** - Monthly KWH usage
- **Cost per unit** - Automatically calculated
- **Fixed vs Variable charges** - Demand charges vs consumption charges
- **Arrears tracking** - Outstanding amounts
- **Trend analysis** - Month-over-month comparisons

### 3. **Power Factor Optimization**
- Identifies power factor issues (< 0.95)
- Calculates potential savings from improvement
- Recommends capacitor bank sizing (KVAR rating)
- **Annual savings estimate** based on improvement to 0.99 PF

### 4. **Production Correlation**
- Links electricity bills to production data
- Calculates:
  - **KWH per sqft** produced
  - **Cost per sqft** (electricity component)
  - **KWH per slab** cut
  - Machine operation hours correlation

### 5. **Time-of-Day (TOD) Scheduling**
- TOD slot breakdown:
  - **00:00-06:00** - Off-peak (cheapest)
  - **06:00-10:00** - Normal
  - **10:00-15:00** - Normal
  - **15:00-18:00** - Peak (most expensive)
  - **18:00-22:00** - Normal
  - **22:00-24:00** - Off-peak
- Recommendations for scheduling production

## 📊 Business Benefits

### Cost Savings
1. **Power Factor Improvement**
   - Example: If PF is 0.93, improving to 0.99 saves ₹1-2L annually
   - ROI on capacitor bank: 6-12 months

2. **TOD Optimization**
   - Running gang saws at night (00:00-06:00) saves 30-40% on energy charges
   - Peak hour avoidance (15:00-18:00) prevents TOD penalties

3. **Demand Charge Management**
   - Monitor peak KVA to avoid unnecessary demand charges
   - Stagger machine startup times

### Production Efficiency
1. **Cost per Sqft Tracking**
   - Know exact electricity cost component in pricing
   - Compare efficiency month-over-month
   - Identify high-consumption periods

2. **Machine Efficiency**
   - Correlate KWH with machine hours
   - Identify inefficient equipment
   - Plan maintenance based on consumption spikes

## 🗂️ Database Structure

### Tables Created
1. **electricity_bills** - Main bill data
2. **electricity_tod_readings** - Time-of-day consumption breakdown
3. **electricity_production_correlation** - Links bills to production
4. **power_factor_improvements** - Tracks PF improvement initiatives

### Key Fields
- `bill_number` - Unique bill identifier
- `kwh_consumption` - Total units consumed
- `power_factor` - PF reading
- `maximum_demand_kva` - Peak demand
- `cost_per_kwh` - Calculated cost per unit
- `total_amount_payable` - Final bill amount
- `arrears_amount` - Outstanding dues

## 📍 Navigation

### Sidebar Menu
**Electricity Info** section added with:
1. **Bills & Upload** (`/electricity`) - Upload and view bills
2. **Production Correlation** (`/electricity/analytics`) - Efficiency analysis

## 🔄 Workflow

### Step 1: Upload Bill
1. Go to **Electricity Info → Bills & Upload**
2. Click "Choose File" and select your PDF bill
3. Click "Parse Bill"
4. System automatically extracts all data

### Step 2: Review Data
- View summary cards:
  - Total consumption
  - Total cost
  - Average cost/KWH
  - Power factor
  - Arrears
- Check monthly bills table

### Step 3: Analyze Efficiency
1. Go to **Electricity Info → Production Correlation**
2. Review:
   - Monthly consumption trends
   - Power factor savings opportunity
   - TOD scheduling recommendations
   - Business insights

### Step 4: Take Action
Based on insights:
- **If PF < 0.95**: Install capacitor banks
- **If high peak charges**: Schedule production off-peak
- **If consumption increasing**: Investigate machine efficiency

## 📈 Key Metrics Explained

### Power Factor (PF)
- **Definition**: Ratio of useful power to total power
- **Ideal**: 0.99 or above
- **Your Bill**: Typically 0.93
- **Impact**: Low PF increases demand charges

### Time of Day (TOD) Charges
- **Purpose**: Encourage off-peak consumption
- **Peak slots** charge 2-3x more than off-peak
- **Optimization**: Run heavy machinery at night

### Demand Charges
- **Based on**: Maximum KVA recorded in month
- **Type**: Fixed cost regardless of consumption
- **Optimization**: Prevent sudden demand spikes

### FPPCA Charges
- **Definition**: Fuel & Power Purchase Cost Adjustment
- **Nature**: Variable, based on coal/fuel prices
- **Impact**: Can change quarterly

## 🎯 Real-World Example (Your Bill)

### Current Situation
- **Bill Month**: OCT-2025
- **Consumption**: 57,134 KWH
- **Cost**: ₹12,13,810 (₹12.1L)
- **Power Factor**: 0.93
- **Peak Demand**: 192 KVA
- **Arrears**: ₹6,52,092 (₹6.5L)

### Optimization Opportunities

#### 1. Power Factor Improvement
- Current PF: 0.93
- Target PF: 0.99
- **Potential Annual Savings**: ₹1.2-1.5L
- **Action**: Install 50-60 KVAR capacitor bank

#### 2. TOD Optimization
- Current: Mixed shift operations
- Recommended: Shift 40% production to 00:00-06:00
- **Potential Monthly Savings**: ₹25-30K

#### 3. Clear Arrears
- Outstanding: ₹6.5L
- Interest: ₹5,103/month
- **Action**: Priority payment to avoid interest

#### 4. Track Production Efficiency
- Calculate KWH per sqft for October production
- Set benchmark for future months
- Monitor deviations

## 🔧 Technical Details

### API Endpoints
- `GET /api/electricity-bills` - List all bills
- `GET /api/electricity-bills?id=<id>` - Get single bill with details
- `POST /api/electricity-bills` - Create bill manually
- `POST /api/electricity-bills/parse` - Upload & parse PDF
- `PUT /api/electricity-bills` - Update bill
- `DELETE /api/electricity-bills?id=<id>` - Delete bill

### PDF Parsing
The system uses regex patterns to extract:
- Bill identification (number, date, month)
- Consumer details
- Meter readings (KWH, KVAH)
- All charge components
- TOD breakdown
- Arrears details

**Supported Formats**:
- APCPDCL (Andhra Pradesh) bills
- Text-based PDFs
- Can be extended for other formats

## 🚀 Next Steps

### Phase 2 Enhancements
1. **SMS/Email Alerts**
   - Due date reminders
   - PF threshold alerts
   - High consumption warnings

2. **Predictive Analytics**
   - Forecast next month's bill
   - Predict production efficiency
   - Identify anomalies

3. **Mobile App**
   - Quick bill upload via phone camera
   - Real-time dashboards
   - Push notifications

4. **Integration**
   - Link with bank for auto-payments
   - Connect with production scheduling system
   - Export reports to accounting

## 📝 Notes

- Bills are stored in Supabase PostgreSQL database
- All calculations are automatic (cost_per_kwh, etc.)
- Historical data preserved for trend analysis
- Correlation with production data is automatic

## ⚠️ Important Reminders

1. **Upload bills promptly** - For accurate tracking
2. **Clear arrears** - Avoid interest charges (₹5K+/month)
3. **Monitor PF monthly** - Install capacitors if consistently < 0.95
4. **Schedule production wisely** - Use TOD insights
5. **Track efficiency** - KWH per sqft should decrease over time

---

**Impact**: This system can save ₹2-3L annually through optimizations! 💰
