-- ============================================================
-- Boulder Construction CRM — Seed Data
-- Transfers all mock data into Supabase tables.
-- Run AFTER schema.sql + migration files.
-- ============================================================

-- ── Employees ───────────────────────────────────────────────
INSERT INTO public.app_employees (id, name, role, email, phone, status, initials, hire_date) VALUES
('EMP-001', 'Mike Thornton', 'Project Director', 'mike@boulderconstruction.com', '(201) 555-0100', 'Active', 'MT', '2018-03-15'),
('EMP-002', 'Jake Rivera', 'Site Superintendent', 'jake@boulderconstruction.com', '(201) 555-0101', 'Active', 'JR', '2019-07-01'),
('EMP-003', 'Aisha Patel', 'Project Engineer', 'aisha@boulderconstruction.com', '(201) 555-0102', 'Active', 'AP', '2020-01-10'),
('EMP-004', 'Carlos Mendes', 'Foreman', 'carlos@boulderconstruction.com', '(201) 555-0103', 'Active', 'CM', '2019-11-20'),
('EMP-005', 'Samantha Brooks', 'Office Manager', 'samantha@boulderconstruction.com', '(201) 555-0104', 'Active', 'SB', '2021-04-05'),
('EMP-006', 'Derek Lawson', 'Safety Officer', 'derek@boulderconstruction.com', '(201) 555-0105', 'Active', 'DL', '2022-08-12')
ON CONFLICT (id) DO NOTHING;

-- ── Clients ─────────────────────────────────────────────────
INSERT INTO public.clients (id, name, company, phone, email, address, status, last_contact, notes) VALUES
('CLI-001', 'Robert Harrington', 'Harrington Properties LLC', '(201) 555-0134', 'robert@harringtonprops.com', '145 Main St, Morristown, NJ 07960', 'Active', '2026-03-28', 'Prefers communication via email. Key commercial client since 2022.'),
('CLI-002', 'Patricia Wells', 'Wells Development Group', '(973) 555-0198', 'pwells@wellsdev.com', '89 Park Ave, Summit, NJ 07901', 'Active', '2026-03-30', 'Interested in sustainable building materials.'),
('CLI-003', 'James Caldwell', 'Caldwell & Sons Realty', '(908) 555-0167', 'jcaldwell@caldwellrealty.com', '321 Broad St, Red Bank, NJ 07701', 'Active', '2026-03-25', 'Referred by Robert Harrington.'),
('CLI-004', 'Elena Vasquez', 'Vasquez Hospitality Inc', '(732) 555-0245', 'elena@vasquezhospitality.com', '550 Ocean Blvd, Long Branch, NJ 07740', 'Active', '2026-03-20', 'Hotel renovation project. Requires weekly progress reports.'),
('CLI-005', 'David Nguyen', 'Nguyen Medical Partners', '(609) 555-0312', 'dnguyen@nguyenmed.com', '78 Nassau St, Princeton, NJ 08542', 'Inactive', '2026-02-15', 'Medical office build-out completed. Potential future project Q3.'),
('CLI-006', 'Sarah Mitchell', 'Mitchell Residential', '(856) 555-0189', 'sarah@mitchellres.com', '205 Kings Hwy, Cherry Hill, NJ 08034', 'Active', '2026-03-29', 'Luxury residential projects. Very detail-oriented.'),
('CLI-007', 'Thomas Brennan', 'Brennan Commercial RE', '(201) 555-0276', 'tbrennan@brennanre.com', '400 Frank W Burr Blvd, Teaneck, NJ 07666', 'Lead', '2026-03-18', 'New lead from trade show. Interested in office buildout.'),
('CLI-008', 'Karen Ostrowski', 'Ostrowski Retail Holdings', '(732) 555-0421', 'karen@ostrowskiholdings.com', '1200 Hooper Ave, Toms River, NJ 08753', 'Active', '2026-03-22', 'Strip mall renovation. Budget-conscious.'),
('CLI-009', 'Anthony Ricci', 'Ricci Brothers Construction', '(973) 555-0388', 'aricci@riccibrothers.com', '65 Church St, Paterson, NJ 07505', 'Inactive', '2026-01-10', 'Subcontractor turned client. Small residential jobs.'),
('CLI-010', 'Linda Park', 'Park Education Foundation', '(908) 555-0455', 'lpark@parkedu.org', '900 Mountain Ave, Berkeley Heights, NJ 07922', 'Active', '2026-03-31', 'Non-profit school expansion. Grant-funded project.')
ON CONFLICT (id) DO NOTHING;

-- ── Projects ────────────────────────────────────────────────
INSERT INTO public.app_projects (id, name, client_id, status, progress, budget, spent, start_date, deadline, description, phase) VALUES
('PRJ-001', 'Harrington Office Complex', 'CLI-001', 'In Progress', 65, 2850000, 1852500, '2026-01-10', '2026-08-15', '3-story commercial office building with underground parking.', 'Structural Framing'),
('PRJ-002', 'Wells Luxury Condos - Phase 1', 'CLI-002', 'In Progress', 40, 5200000, 2080000, '2026-02-01', '2026-11-30', '12-unit luxury condominium building with rooftop amenities.', 'Foundation'),
('PRJ-003', 'Caldwell Retail Renovation', 'CLI-003', 'In Progress', 80, 420000, 336000, '2025-12-15', '2026-05-01', 'Interior renovation of 5,000 sq ft retail space in downtown Red Bank.', 'Interior Finishing'),
('PRJ-004', 'Vasquez Boutique Hotel', 'CLI-004', 'Planning', 10, 8500000, 850000, '2026-04-15', '2027-06-01', '45-room boutique hotel with restaurant and event space on the Long Branch waterfront.', 'Pre-Construction'),
('PRJ-005', 'Mitchell Estate - Custom Home', 'CLI-006', 'In Progress', 55, 1750000, 962500, '2025-11-01', '2026-09-30', '6,200 sq ft custom luxury home in Cherry Hill with pool and guest house.', 'MEP Rough-In'),
('PRJ-006', 'Ostrowski Plaza Refresh', 'CLI-008', 'On Hold', 25, 680000, 170000, '2026-01-20', '2026-07-15', 'Exterior facade renovation and parking lot resurfacing for strip mall.', 'Exterior'),
('PRJ-007', 'Park Academy Expansion', 'CLI-010', 'In Progress', 35, 3100000, 1085000, '2026-02-15', '2026-12-01', 'New 20,000 sq ft wing for STEM classrooms and auditorium.', 'Foundation'),
('PRJ-008', 'Mitchell Townhomes', 'CLI-006', 'Completed', 100, 2200000, 2090000, '2025-06-01', '2026-02-28', '4-unit luxury townhome development in Cherry Hill.', 'Completed')
ON CONFLICT (id) DO NOTHING;

-- ── Subcontractors ──────────────────────────────────────────
INSERT INTO public.app_subcontractors (id, name, trade, contact, phone, email, address, license, insurance, rating, active_projects, status, certifications) VALUES
('SUB-001', 'Precision Electric Inc', 'Electrical', 'Frank DiMaggio', '(973) 555-0501', 'info@precisionelectric.com', '120 Industrial Way, Newark, NJ 07114', 'NJ-EL-28451', '2027-01-15', 4.8, 3, 'Active', ARRAY['Licensed Master Electrician', 'OSHA 30']),
('SUB-002', 'Garden State Plumbing', 'Plumbing', 'Maria Santos', '(732) 555-0502', 'office@gsplumbing.com', '85 Commerce Dr, Edison, NJ 08817', 'NJ-PL-19283', '2026-11-30', 4.5, 2, 'Active', ARRAY['Licensed Master Plumber', 'Backflow Certified']),
('SUB-003', 'Allied HVAC Solutions', 'HVAC', 'Tom Kessler', '(908) 555-0503', 'service@alliedhvac.com', '340 Route 22 W, Bridgewater, NJ 08807', 'NJ-HVAC-33721', '2026-09-01', 4.7, 2, 'Active', ARRAY['EPA 608 Universal', 'NATE Certified']),
('SUB-004', 'Ironclad Structural Steel', 'Steel Fabrication', 'Ray Wojcik', '(201) 555-0504', 'quotes@ironcladsteel.com', '500 River Rd, Kearny, NJ 07032', 'NJ-SF-44102', '2027-03-01', 4.9, 1, 'Active', ARRAY['AISC Certified Fabricator', 'AWS Certified Welders']),
('SUB-005', 'Tri-County Concrete', 'Concrete', 'Joe Bianchi', '(856) 555-0505', 'dispatch@tricountyconcrete.com', '220 Delsea Dr, Vineland, NJ 08360', 'NJ-CC-15567', '2026-12-15', 4.3, 2, 'Active', ARRAY['ACI Certified', 'OSHA 10'])
ON CONFLICT (id) DO NOTHING;

-- ── Contracts ───────────────────────────────────────────────
INSERT INTO public.app_contracts (id, title, client_id, client_name, company, project_id, project_name, type, status, contract_value, start_date, end_date, signed_date, sent_date, scope_of_work, payment_terms, notes) VALUES
('CON-001', 'Harrington Office Complex — General Contract', 'CLI-001', 'Robert Harrington', 'Harrington Properties LLC', 'PRJ-001', 'Harrington Office Complex', 'Lump Sum', 'Signed', 2850000, '2026-01-10', '2026-08-15', '2026-01-05', '2025-12-28', 'Construction of a 3-story commercial office building with underground parking garage.', 'Monthly AIA G702 pay applications. Net 30. 10% retainage until 50% completion, reduced to 5% thereafter.', 'Owner requested LEED Silver certification. Weekly OAC meetings required.'),
('CON-002', 'Wells Luxury Condos Phase 1 — General Contract', 'CLI-002', 'Patricia Wells', 'Wells Development Group', 'PRJ-002', 'Wells Luxury Condos - Phase 1', 'GMP', 'Signed', 5200000, '2026-02-01', '2026-11-30', '2026-01-25', '2026-01-18', 'Construction of 12-unit luxury condominium building with rooftop amenities, pool deck, and below-grade parking.', 'Monthly draw schedule. 5% retainage. Savings split 50/50 below GMP.', 'Client requires weekly written progress reports.'),
('CON-003', 'Caldwell Retail Renovation — Fixed Price Contract', 'CLI-003', 'James Caldwell', 'Caldwell & Sons Realty', 'PRJ-003', 'Caldwell Retail Renovation', 'Lump Sum', 'Signed', 420000, '2025-12-15', '2026-05-01', '2025-12-10', '2025-12-05', 'Interior renovation of 5,000 sq ft retail space.', 'Net 30. 3 milestone payments: mobilization 20%, rough-in complete 40%, substantial completion 40%.', 'Tenant must remain partially operational.'),
('CON-004', 'Vasquez Boutique Hotel — Pre-Construction Services', 'CLI-004', 'Elena Vasquez', 'Vasquez Hospitality Inc', 'PRJ-004', 'Vasquez Boutique Hotel', 'Cost Plus', 'Draft', 8500000, '2026-04-15', '2027-06-01', NULL, NULL, '45-room boutique hotel with restaurant and event space. Cost-plus fee at 8%.', 'Monthly invoicing of actual costs plus 8% fee.', 'Coastal zone — DEP permit required.'),
('CON-005', 'Mitchell Estate — Custom Home Contract', 'CLI-006', 'Sarah Mitchell', 'Mitchell Residential', 'PRJ-005', 'Mitchell Estate - Custom Home', 'Cost Plus', 'Signed', 1750000, '2025-11-01', '2026-09-30', '2025-10-22', '2025-10-15', '6,200 sq ft custom luxury home with pool and guest house.', 'Monthly cost-plus at 12% overhead & profit.', 'Owner has design approval on all finish selections.'),
('CON-006', 'Park Academy Expansion — Construction Contract', 'CLI-010', 'Linda Park', 'Park Education Foundation', 'PRJ-007', 'Park Academy Expansion', 'Lump Sum', 'Sent', 3100000, '2026-03-01', '2026-12-15', NULL, '2026-02-25', 'New 18,000 sq ft academic wing with classrooms, labs, and auditorium.', 'AIA monthly pay applications. 10% retainage. Prevailing wage.', 'Grant-funded. Work must not disturb school operations.')
ON CONFLICT (id) DO NOTHING;

-- ── Contract Line Items ─────────────────────────────────────
INSERT INTO public.contract_line_items (id, contract_id, description, amount, sort_order) VALUES
('CLI-C1-1', 'CON-001', 'Pre-Construction & Mobilization', 142500, 0),
('CLI-C1-2', 'CON-001', 'Foundation & Concrete Work', 580000, 1),
('CLI-C1-3', 'CON-001', 'Structural Steel & Framing', 710000, 2),
('CLI-C1-4', 'CON-001', 'MEP Systems', 620000, 3),
('CLI-C1-5', 'CON-001', 'Exterior Envelope & Roofing', 380000, 4),
('CLI-C1-6', 'CON-001', 'Interior Finishes', 285000, 5),
('CLI-C1-7', 'CON-001', 'Underground Parking', 132500, 6),
('CLI-C2-1', 'CON-002', 'Demolition & Site Work', 320000, 0),
('CLI-C2-2', 'CON-002', 'Foundation & Waterproofing', 780000, 1),
('CLI-C2-3', 'CON-002', 'Structural Framing', 1100000, 2),
('CLI-C2-4', 'CON-002', 'MEP & Fire Protection', 980000, 3),
('CLI-C2-5', 'CON-002', 'Rooftop Deck & Pool', 650000, 4),
('CLI-C2-6', 'CON-002', 'Interior Finishes (Luxury)', 970000, 5),
('CLI-C2-7', 'CON-002', 'Contingency (GMP)', 400000, 6),
('CLI-C3-1', 'CON-003', 'Demolition & Abatement', 65000, 0),
('CLI-C3-2', 'CON-003', 'Framing & Drywall', 110000, 1),
('CLI-C3-3', 'CON-003', 'Flooring', 85000, 2),
('CLI-C3-4', 'CON-003', 'Paint & Finishes', 45000, 3),
('CLI-C3-5', 'CON-003', 'Fixture Installation', 75000, 4),
('CLI-C3-6', 'CON-003', 'Permits & Closeout', 40000, 5),
('CLI-C4-1', 'CON-004', 'Pre-Construction & Design Assist', 250000, 0),
('CLI-C4-2', 'CON-004', 'Site Work & Foundation', 1100000, 1),
('CLI-C4-3', 'CON-004', 'Structural Frame & Core', 1800000, 2),
('CLI-C4-4', 'CON-004', 'MEP Systems (Hotel Grade)', 1500000, 3),
('CLI-C4-5', 'CON-004', 'Exterior & Waterproofing', 950000, 4),
('CLI-C4-6', 'CON-004', 'Interior FF&E Allowance', 1700000, 5),
('CLI-C4-7', 'CON-004', 'Restaurant & Rooftop Bar', 680000, 6),
('CLI-C4-8', 'CON-004', 'Contingency & Fee', 520000, 7),
('CLI-C5-1', 'CON-005', 'Foundation & Slab', 185000, 0),
('CLI-C5-2', 'CON-005', 'Framing — Main House', 320000, 1),
('CLI-C5-3', 'CON-005', 'MEP Rough-In', 280000, 2),
('CLI-C5-4', 'CON-005', 'Exterior & Roofing', 210000, 3),
('CLI-C5-5', 'CON-005', 'Interior Finishes & Millwork', 380000, 4),
('CLI-C5-6', 'CON-005', 'Pool & Landscaping', 175000, 5),
('CLI-C5-7', 'CON-005', 'Guest House', 200000, 6),
('CLI-C6-1', 'CON-006', 'Site Work & Utilities', 280000, 0),
('CLI-C6-2', 'CON-006', 'Foundation', 420000, 1),
('CLI-C6-3', 'CON-006', 'Structural & Framing', 680000, 2),
('CLI-C6-4', 'CON-006', 'MEP Systems', 590000, 3),
('CLI-C6-5', 'CON-006', 'Auditorium Expansion', 380000, 4),
('CLI-C6-6', 'CON-006', 'Interior Finishes', 450000, 5),
('CLI-C6-7', 'CON-006', 'Athletic Facilities', 300000, 6)
ON CONFLICT (id) DO NOTHING;

-- ── Estimates ───────────────────────────────────────────────
INSERT INTO public.app_estimates (id, client_id, project_name, status, subtotal, tax, grand_total, valid_until, estimate_date) VALUES
('EST-001', 'CLI-001', 'Harrington Office Complex', 'Accepted', 2850000, 0, 2850000, '2026-01-01', '2025-12-01'),
('EST-002', 'CLI-002', 'Wells Luxury Condos - Phase 1', 'Accepted', 5200000, 0, 5200000, '2026-01-15', '2025-12-15'),
('EST-003', 'CLI-004', 'Vasquez Boutique Hotel', 'Sent', 8500000, 0, 8500000, '2026-04-01', '2026-03-01'),
('EST-004', 'CLI-007', 'Brennan Office Buildout', 'Draft', 385000, 0, 385000, '2026-04-20', '2026-03-20'),
('EST-005', 'CLI-010', 'Park Academy Expansion', 'Accepted', 3100000, 0, 3100000, '2026-02-05', '2026-01-05'),
('EST-006', 'CLI-003', 'Caldwell Retail Renovation', 'Accepted', 420000, 0, 420000, '2025-12-10', '2025-11-10')
ON CONFLICT (id) DO NOTHING;

-- ── Change Orders ───────────────────────────────────────────
INSERT INTO public.app_change_orders (id, project_id, description, amount, status, co_date, requested_by) VALUES
('CO-001', 'PRJ-001', 'Add reinforced steel beams per updated structural analysis', 48500, 'Approved', '2026-02-20', 'Client'),
('CO-002', 'PRJ-002', 'Upgrade all unit windows to triple-pane for sound insulation', 87000, 'Pending', '2026-03-15', 'Client'),
('CO-003', 'PRJ-003', 'Additional electrical circuits for display lighting', 12800, 'Approved', '2026-03-01', 'Contractor'),
('CO-004', 'PRJ-005', 'Redesign master bathroom with heated floors and steam shower', 34200, 'Approved', '2026-03-10', 'Client'),
('CO-005', 'PRJ-007', 'Add solar panel mounting infrastructure to roof design', 56000, 'Under Review', '2026-03-25', 'Client')
ON CONFLICT (id) DO NOTHING;

-- ── Change Order Versions ───────────────────────────────────
INSERT INTO public.change_order_versions (id, change_order_id, version_number, amount, notes, version_date) VALUES
('COV-001-1', 'CO-001', 1, 52000, 'Initial estimate based on engineer report', '2026-02-15'),
('COV-001-2', 'CO-001', 2, 48500, 'Revised after sourcing alternative steel supplier', '2026-02-20'),
('COV-002-1', 'CO-002', 1, 87000, 'Premium Marvin triple-pane windows per client request', '2026-03-15'),
('COV-003-1', 'CO-003', 1, 12800, 'Required for tenant display lighting requirements', '2026-03-01'),
('COV-004-1', 'CO-004', 1, 41000, 'Full bathroom redesign with premium fixtures', '2026-03-05'),
('COV-004-2', 'CO-004', 2, 34200, 'Client selected alternative tile, reduced scope', '2026-03-10'),
('COV-005-1', 'CO-005', 1, 56000, 'Structural reinforcement and conduit for 50kW solar array', '2026-03-25')
ON CONFLICT (id) DO NOTHING;

-- ── RFIs ────────────────────────────────────────────────────
INSERT INTO public.rfis (id, project_id, subject, status, date_submitted, date_responded, submitted_by, response) VALUES
('RFI-001', 'PRJ-001', 'Clarification on elevator shaft dimensions', 'Responded', '2026-02-10', '2026-02-14', 'Jake Rivera', 'Revised drawings issued showing 8ft x 8ft shaft. See drawing A-302 Rev 2.'),
('RFI-002', 'PRJ-002', 'Soil bearing capacity at northeast corner', 'Open', '2026-03-28', NULL, 'Carlos Mendes', NULL),
('RFI-003', 'PRJ-007', 'ADA compliance for auditorium seating layout', 'Responded', '2026-03-15', '2026-03-18', 'Aisha Patel', 'Architect confirmed layout meets ADA Title III requirements. See updated seating plan S-105.'),
('RFI-004', 'PRJ-005', 'Pool equipment room ventilation requirements', 'Open', '2026-03-30', NULL, 'Jake Rivera', NULL),
('RFI-005', 'PRJ-003', 'Fire rating for demising wall between tenant spaces', 'Closed', '2026-01-20', '2026-01-22', 'Aisha Patel', '2-hour fire rating required per NJ Building Code Section 707. Type X drywall both sides.')
ON CONFLICT (id) DO NOTHING;

-- ── Documents ───────────────────────────────────────────────
INSERT INTO public.app_documents (id, name, type, project, project_id, upload_date, uploaded_by, size, category) VALUES
('DOC-001', 'Harrington Office - Architectural Plans Rev 3.pdf', 'PDF', 'Harrington Office Complex', 'PRJ-001', '2026-01-15', 'Mike Thornton', '24.5 MB', 'Plans'),
('DOC-002', 'Structural Engineering Report.pdf', 'PDF', 'Harrington Office Complex', 'PRJ-001', '2026-01-20', 'Aisha Patel', '8.2 MB', 'Reports'),
('DOC-003', 'Wells Condos - Site Survey.pdf', 'PDF', 'Wells Luxury Condos - Phase 1', 'PRJ-002', '2026-02-05', 'Jake Rivera', '15.7 MB', 'Survey'),
('DOC-004', 'Building Permit - Caldwell Retail.pdf', 'PDF', 'Caldwell Retail Renovation', 'PRJ-003', '2025-12-20', 'Samantha Brooks', '2.1 MB', 'Permits'),
('DOC-005', 'Mitchell Estate - Floor Plans.dwg', 'CAD', 'Mitchell Estate - Custom Home', 'PRJ-005', '2025-11-10', 'Aisha Patel', '45.3 MB', 'Plans'),
('DOC-006', 'Insurance Certificate - Precision Electric.pdf', 'PDF', NULL, NULL, '2026-01-05', 'Samantha Brooks', '1.4 MB', 'Insurance'),
('DOC-007', 'Park Academy - Geotech Report.pdf', 'PDF', 'Park Academy Expansion', 'PRJ-007', '2026-02-20', 'Jake Rivera', '12.8 MB', 'Reports'),
('DOC-008', 'Safety Inspection Photos - March 2026.zip', 'Archive', 'Harrington Office Complex', 'PRJ-001', '2026-03-30', 'Derek Lawson', '156.2 MB', 'Photos'),
('DOC-009', 'Vasquez Hotel - Concept Renders.pptx', 'Presentation', 'Vasquez Boutique Hotel', 'PRJ-004', '2026-03-05', 'Mike Thornton', '38.9 MB', 'Presentations'),
('DOC-010', 'Subcontractor Agreement Template.docx', 'Word', NULL, NULL, '2025-10-15', 'Samantha Brooks', '0.8 MB', 'Templates')
ON CONFLICT (id) DO NOTHING;

-- ── Timesheets ──────────────────────────────────────────────
INSERT INTO public.app_timesheets (id, employee, employee_id, project, project_id, phase, date, clock_in, clock_out, hours, status) VALUES
('TS-001', 'Jake Rivera', 'EMP-002', 'Harrington Office Complex', 'PRJ-001', 'Structural Framing', '2026-03-31', '06:30', '15:30', 9, 'Pending Approval'),
('TS-002', 'Aisha Patel', 'EMP-003', 'Harrington Office Complex', 'PRJ-001', 'Structural Framing', '2026-03-31', '07:00', '16:00', 9, 'Pending Approval'),
('TS-003', 'Carlos Mendes', 'EMP-004', 'Wells Luxury Condos - Phase 1', 'PRJ-002', 'Foundation', '2026-03-31', '06:00', '14:30', 8.5, 'Pending Approval'),
('TS-004', 'Jake Rivera', 'EMP-002', 'Harrington Office Complex', 'PRJ-001', 'Structural Framing', '2026-03-30', '06:30', '16:30', 10, 'Approved'),
('TS-005', 'Aisha Patel', 'EMP-003', 'Caldwell Retail Renovation', 'PRJ-003', 'Interior Finishing', '2026-03-30', '07:00', '15:00', 8, 'Approved'),
('TS-006', 'Carlos Mendes', 'EMP-004', 'Caldwell Retail Renovation', 'PRJ-003', 'Interior Finishing', '2026-03-30', '07:00', '16:00', 9, 'Approved'),
('TS-007', 'Derek Lawson', 'EMP-006', 'Wells Luxury Condos - Phase 1', 'PRJ-002', 'Foundation', '2026-03-31', '07:00', '12:00', 5, 'Pending Approval'),
('TS-008', 'Mike Thornton', 'EMP-001', 'Park Academy Expansion', 'PRJ-007', 'Foundation', '2026-03-31', '08:00', '17:00', 9, 'Pending Approval'),
('TS-009', 'Jake Rivera', 'EMP-002', 'Mitchell Estate - Custom Home', 'PRJ-005', 'MEP Rough-In', '2026-03-29', '06:30', '15:00', 8.5, 'Approved'),
('TS-010', 'Aisha Patel', 'EMP-003', 'Park Academy Expansion', 'PRJ-007', 'Foundation', '2026-03-29', '07:00', '16:30', 9.5, 'Approved'),
('TS-011', 'Carlos Mendes', 'EMP-004', 'Mitchell Estate - Custom Home', 'PRJ-005', 'MEP Rough-In', '2026-03-29', '06:00', '15:00', 9, 'Approved'),
('TS-012', 'Jake Rivera', 'EMP-002', 'Harrington Office Complex', 'PRJ-001', 'Structural Framing', '2026-03-28', '06:30', '17:00', 10.5, 'Approved'),
('TS-013', 'Samantha Brooks', 'EMP-005', 'Office Admin', NULL, 'Administration', '2026-03-31', '08:30', '17:00', 8.5, 'Approved'),
('TS-014', 'Derek Lawson', 'EMP-006', 'Harrington Office Complex', 'PRJ-001', 'Safety Inspection', '2026-03-30', '07:00', '11:00', 4, 'Approved'),
('TS-015', 'Mike Thornton', 'EMP-001', 'Vasquez Boutique Hotel', 'PRJ-004', 'Pre-Construction', '2026-03-30', '09:00', '17:00', 8, 'Approved')
ON CONFLICT (id) DO NOTHING;

-- ── Pay Applications (Invoices / G702) ──────────────────────
-- NOTE: Must come BEFORE lien_waivers due to FK constraint on invoice_id
INSERT INTO public.pay_applications (id, application_no, contract_id, project_id, project_name, owner_name, owner_address, contractor_name, contractor_address, contract_for, contract_date, period_to, application_date, original_contract_sum, net_change_orders, contract_sum_to_date, total_completed_and_stored, retainage_percent, total_retainage, total_earned_less_retainage, less_previous_certificates, current_payment_due, balance_to_finish, status, client_id) VALUES
('INV-001', 1, 'CON-001', 'PRJ-001', 'Harrington Office Complex', 'Harrington Properties LLC', '145 Main St, Morristown, NJ 07960', 'Boulder Construction', '123 Commerce Way, Newark, NJ 07102', 'General Construction', '2026-01-10', '2026-03-15', '2026-02-15', 2850000, 48500, 2898500, 570000, '10', 57000, 513000, 0, 570000, 2328500, 'Paid', 'CLI-001'),
('INV-002', 2, 'CON-001', 'PRJ-001', 'Harrington Office Complex', 'Harrington Properties LLC', '145 Main St, Morristown, NJ 07960', 'Boulder Construction', '123 Commerce Way, Newark, NJ 07102', 'General Construction', '2026-01-10', '2026-04-15', '2026-03-15', 2850000, 48500, 2898500, 1282500, '10', 128250, 1154250, 513000, 712500, 1744250, 'Pending', 'CLI-001'),
('INV-003', 1, 'CON-002', 'PRJ-002', 'Wells Luxury Condos - Phase 1', 'Wells Development Group', '89 Park Ave, Summit, NJ 07901', 'Boulder Construction', '123 Commerce Way, Newark, NJ 07102', 'General Construction', '2026-02-01', '2026-03-01', '2026-02-01', 5200000, 87000, 5287000, 1040000, '10', 104000, 936000, 0, 1040000, 4351000, 'Paid', 'CLI-002'),
('INV-004', 2, 'CON-002', 'PRJ-002', 'Wells Luxury Condos - Phase 1', 'Wells Development Group', '89 Park Ave, Summit, NJ 07901', 'Boulder Construction', '123 Commerce Way, Newark, NJ 07102', 'General Construction', '2026-02-01', '2026-04-01', '2026-03-01', 5200000, 87000, 5287000, 2080000, '10', 208000, 1872000, 936000, 1040000, 3415000, 'Pending', 'CLI-002'),
('INV-005', 1, 'CON-003', 'PRJ-003', 'Caldwell Retail Renovation', 'Caldwell & Sons Realty', '321 Broad St, Red Bank, NJ 07701', 'Boulder Construction', '123 Commerce Way, Newark, NJ 07102', 'Interior Renovation', '2025-12-15', '2026-02-15', '2026-01-15', 420000, 12800, 432800, 168000, '10', 16800, 151200, 0, 168000, 281600, 'Paid', 'CLI-003'),
('INV-006', 2, 'CON-003', 'PRJ-003', 'Caldwell Retail Renovation', 'Caldwell & Sons Realty', '321 Broad St, Red Bank, NJ 07701', 'Boulder Construction', '123 Commerce Way, Newark, NJ 07102', 'Interior Renovation', '2025-12-15', '2026-04-05', '2026-03-05', 420000, 12800, 432800, 287500, '10', 28750, 258750, 151200, 168000, 174050, 'Overdue', 'CLI-003'),
('INV-007', 1, 'CON-005', 'PRJ-005', 'Mitchell Estate - Custom Home', 'Mitchell Residential', '205 Kings Hwy, Cherry Hill, NJ 08034', 'Boulder Construction', '123 Commerce Way, Newark, NJ 07102', 'Custom Home', '2025-11-01', '2026-03-30', '2026-02-28', 1750000, 34200, 1784200, 437500, '12', 52500, 385000, 0, 437500, 1399200, 'Paid', 'CLI-006'),
('INV-008', 1, NULL, 'PRJ-008', 'Mitchell Townhomes', 'Mitchell Residential', '205 Kings Hwy, Cherry Hill, NJ 08034', 'Boulder Construction', '123 Commerce Way, Newark, NJ 07102', 'Townhome Development', '2025-06-01', '2026-02-28', '2026-01-28', 2200000, 0, 2200000, 522500, '0', 0, 522500, 0, 522500, 1677500, 'Paid', 'CLI-006'),
('INV-009', 1, 'CON-006', 'PRJ-007', 'Park Academy Expansion', 'Park Education Foundation', '900 Mountain Ave, Berkeley Heights, NJ 07922', 'Boulder Construction', '123 Commerce Way, Newark, NJ 07102', 'School Construction', '2026-02-15', '2026-04-15', '2026-03-15', 3100000, 56000, 3156000, 620000, '10', 62000, 558000, 0, 620000, 2598000, 'Pending', 'CLI-010'),
('INV-010', 1, NULL, 'PRJ-006', 'Ostrowski Plaza Refresh', 'Ostrowski Retail Holdings', '1200 Hooper Ave, Toms River, NJ 08753', 'Boulder Construction', '123 Commerce Way, Newark, NJ 07102', 'Facade Renovation', '2026-01-20', '2026-03-20', '2026-02-20', 680000, 0, 680000, 170000, '0', 0, 170000, 0, 170000, 510000, 'Overdue', 'CLI-008')
ON CONFLICT (id) DO NOTHING;

-- ── Pay Application Line Items (G703) ───────────────────────
INSERT INTO public.pay_application_line_items (id, pay_application_id, item_no, description, scheduled_value, previous_application, this_period, materials_stored, total_completed, percent_complete, balance_to_finish, retainage, sort_order) VALUES
('PALI-001-1', 'INV-001', 1, 'Pre-Construction & Mobilization', 142500, 0, 142500, 0, 142500, 100, 0, 14250, 0),
('PALI-001-2', 'INV-001', 2, 'Foundation & Concrete Work', 580000, 0, 427500, 0, 427500, 73.7, 152500, 42750, 1),
('PALI-002-1', 'INV-002', 1, 'Pre-Construction & Mobilization', 142500, 142500, 0, 0, 142500, 100, 0, 14250, 0),
('PALI-002-2', 'INV-002', 2, 'Foundation & Concrete Work', 580000, 427500, 152500, 0, 580000, 100, 0, 58000, 1),
('PALI-002-3', 'INV-002', 3, 'Structural Steel & Framing', 710000, 0, 560000, 150000, 560000, 78.9, 150000, 56000, 2),
('PALI-003-1', 'INV-003', 1, 'Demolition & Site Work', 320000, 0, 320000, 0, 320000, 100, 0, 32000, 0),
('PALI-003-2', 'INV-003', 2, 'Foundation & Waterproofing', 780000, 0, 720000, 0, 720000, 92.3, 60000, 72000, 1),
('PALI-004-1', 'INV-004', 1, 'Demolition & Site Work', 320000, 320000, 0, 0, 320000, 100, 0, 32000, 0),
('PALI-004-2', 'INV-004', 2, 'Foundation & Waterproofing', 780000, 720000, 60000, 0, 780000, 100, 0, 78000, 1),
('PALI-004-3', 'INV-004', 3, 'Structural Framing', 1100000, 0, 980000, 0, 980000, 89.1, 120000, 98000, 2),
('PALI-005-1', 'INV-005', 1, 'Demolition & Abatement', 65000, 0, 65000, 0, 65000, 100, 0, 6500, 0),
('PALI-005-2', 'INV-005', 2, 'Framing & Drywall', 110000, 0, 103000, 0, 103000, 93.6, 7000, 10300, 1),
('PALI-006-1', 'INV-006', 1, 'Demolition & Abatement', 65000, 65000, 0, 0, 65000, 100, 0, 6500, 0),
('PALI-006-2', 'INV-006', 2, 'Framing & Drywall', 110000, 103000, 7000, 0, 110000, 100, 0, 11000, 1),
('PALI-006-3', 'INV-006', 3, 'Flooring', 85000, 0, 76500, 0, 76500, 90, 8500, 7650, 2),
('PALI-006-4', 'INV-006', 4, 'Paint & Finishes', 45000, 0, 36000, 0, 36000, 80, 9000, 3600, 3),
('PALI-007-1', 'INV-007', 1, 'Foundation & Slab', 185000, 0, 185000, 0, 185000, 100, 0, 22200, 0),
('PALI-007-2', 'INV-007', 2, 'Framing — Main House', 320000, 0, 252500, 0, 252500, 78.9, 67500, 30300, 1),
('PALI-008-1', 'INV-008', 1, 'Final Payment - Project Completion', 522500, 0, 522500, 0, 522500, 100, 0, 0, 0),
('PALI-009-1', 'INV-009', 1, 'Site Work & Utilities', 280000, 0, 280000, 0, 280000, 100, 0, 28000, 0),
('PALI-009-2', 'INV-009', 2, 'Foundation', 420000, 0, 340000, 0, 340000, 81, 80000, 34000, 1),
('PALI-010-1', 'INV-010', 1, 'Progress Payment - Facade Assessment & Demo', 170000, 0, 170000, 0, 170000, 100, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- ── Lien Waivers ────────────────────────────────────────────
INSERT INTO public.app_lien_waivers (id, waiver_category, condition_type, project_name, project_id, signer_name, furnisher, owner_contractor, job_name_address, waiver_amount, final_balance, signer_company, signer_title, invoice_id, waiver_date, status) VALUES
('LW-001', 'Partial', 'Conditional', 'Harrington Office Complex', 'PRJ-001', 'Ray Wojcik', 'Ironclad Structural Steel', 'Harrington Properties LLC', '145 Main St, Morristown, NJ 07960', 214200, 0, 'Ironclad Structural Steel', 'President', 'INV-001', '2026-03-31', 'Pending Signature'),
('LW-002', 'Partial', 'Unconditional', 'Harrington Office Complex', 'PRJ-001', 'Frank DiMaggio', 'Precision Electric Inc', 'Harrington Properties LLC', '145 Main St, Morristown, NJ 07960', 140400, 0, 'Precision Electric Inc', 'Owner', 'INV-002', '2026-03-31', 'Signed'),
('LW-003', 'Partial', 'Conditional', 'Wells Luxury Condos - Phase 1', 'PRJ-002', 'Joe Bianchi', 'Tri-County Concrete', 'Wells Development Group', '89 Park Ave, Summit, NJ 07901', 178000, 0, 'Tri-County Concrete', 'Operations Manager', 'INV-004', '2026-03-28', 'Signed'),
('LW-004', 'Final', 'Unconditional', 'Caldwell Retail Renovation', 'PRJ-003', 'Maria Santos', 'Garden State Plumbing', 'Caldwell & Sons Realty', '321 Broad St, Red Bank, NJ 07701', 0, 38000, 'Garden State Plumbing', 'Managing Partner', NULL, '2026-03-15', 'Signed'),
('LW-005', 'Partial', 'Conditional', 'Park Academy Expansion', 'PRJ-007', 'Tom Kessler', 'Allied HVAC Solutions', 'Park Education Foundation', '900 Mountain Ave, Berkeley Heights, NJ 07922', 0, 0, 'Allied HVAC Solutions', 'Vice President', NULL, '2026-04-01', 'Draft')
ON CONFLICT (id) DO NOTHING;

-- ── Schedule Events ─────────────────────────────────────────
INSERT INTO public.app_schedule_events (id, title, project, project_id, date, end_date, color, type) VALUES
('SCH-001', 'Steel Delivery - Harrington', 'Harrington Office Complex', 'PRJ-001', '2026-04-02', '2026-04-02', '#3b82f6', 'delivery'),
('SCH-002', 'Foundation Inspection', 'Park Academy Expansion', 'PRJ-007', '2026-04-03', '2026-04-03', '#10b981', 'inspection'),
('SCH-003', 'Concrete Pour - Wells Condos', 'Wells Luxury Condos - Phase 1', 'PRJ-002', '2026-04-04', '2026-04-04', '#8b5cf6', 'milestone'),
('SCH-004', 'Flooring Install - Caldwell', 'Caldwell Retail Renovation', 'PRJ-003', '2026-04-01', '2026-04-05', '#f59e0b', 'task'),
('SCH-005', 'Permit Meeting - Vasquez Hotel', 'Vasquez Boutique Hotel', 'PRJ-004', '2026-04-07', '2026-04-07', '#ef4444', 'meeting'),
('SCH-006', 'HVAC Rough-In - Mitchell Estate', 'Mitchell Estate - Custom Home', 'PRJ-005', '2026-04-01', '2026-04-10', '#06b6d4', 'task'),
('SCH-007', 'Safety Training - All Sites', 'All Projects', NULL, '2026-04-08', '2026-04-08', '#ec4899', 'training'),
('SCH-008', '2nd Floor Framing - Harrington', 'Harrington Office Complex', 'PRJ-001', '2026-04-01', '2026-04-18', '#3b82f6', 'task'),
('SCH-009', 'Foundation Walls - Wells', 'Wells Luxury Condos - Phase 1', 'PRJ-002', '2026-04-07', '2026-04-21', '#8b5cf6', 'task'),
('SCH-010', 'Auditorium Footings - Park Academy', 'Park Academy Expansion', 'PRJ-007', '2026-04-06', '2026-04-14', '#10b981', 'task')
ON CONFLICT (id) DO NOTHING;

-- ── Communications ──────────────────────────────────────────
INSERT INTO public.app_communications (id, client_id, date, type, subject, notes) VALUES
('COM-001', 'CLI-001', '2026-03-28', 'Email', 'March progress report sent', 'Sent monthly progress report with photos. Client acknowledged receipt.'),
('COM-002', 'CLI-001', '2026-03-20', 'Meeting', 'On-site walkthrough', 'Met at Harrington Office Complex. Discussed steel timeline and Change Order CO-001.'),
('COM-003', 'CLI-002', '2026-03-30', 'Phone', 'Window upgrade discussion', 'Patricia called about upgrading to triple-pane windows. Sent Change Order CO-002 for review.'),
('COM-004', 'CLI-004', '2026-03-20', 'Email', 'Estimate follow-up', 'Sent follow-up on EST-003. Elena reviewing with her board this week.'),
('COM-005', 'CLI-006', '2026-03-29', 'Meeting', 'Design review - Master bath revision', 'Reviewed updated master bathroom plans. Sarah approved heated floor layout.'),
('COM-006', 'CLI-010', '2026-03-31', 'Email', 'Solar panel add-on proposal', 'Sent CO-005 details for solar infrastructure. Linda will discuss with foundation board.')
ON CONFLICT (id) DO NOTHING;

-- ── Job Costs ───────────────────────────────────────────────
INSERT INTO public.app_job_costs (id, project_id, project_name, category, budgeted, actual) VALUES
('JC-001', 'PRJ-001', 'Harrington Office Complex', 'Labor', 680000, 445200),
('JC-002', 'PRJ-001', 'Harrington Office Complex', 'Materials', 950000, 612000),
('JC-003', 'PRJ-001', 'Harrington Office Complex', 'Subcontractors', 820000, 548300),
('JC-004', 'PRJ-001', 'Harrington Office Complex', 'Equipment', 200000, 147000),
('JC-005', 'PRJ-001', 'Harrington Office Complex', 'General Conditions', 200000, 100000),
('JC-006', 'PRJ-002', 'Wells Luxury Condos - Phase 1', 'Labor', 1200000, 480000),
('JC-007', 'PRJ-002', 'Wells Luxury Condos - Phase 1', 'Materials', 1800000, 720000),
('JC-008', 'PRJ-002', 'Wells Luxury Condos - Phase 1', 'Subcontractors', 1500000, 580000),
('JC-009', 'PRJ-002', 'Wells Luxury Condos - Phase 1', 'Equipment', 400000, 180000),
('JC-010', 'PRJ-002', 'Wells Luxury Condos - Phase 1', 'General Conditions', 300000, 120000),
('JC-011', 'PRJ-003', 'Caldwell Retail Renovation', 'Labor', 120000, 98400),
('JC-012', 'PRJ-003', 'Caldwell Retail Renovation', 'Materials', 145000, 118000),
('JC-013', 'PRJ-003', 'Caldwell Retail Renovation', 'Subcontractors', 95000, 82600),
('JC-014', 'PRJ-003', 'Caldwell Retail Renovation', 'Equipment', 30000, 22000),
('JC-015', 'PRJ-003', 'Caldwell Retail Renovation', 'General Conditions', 30000, 15000)
ON CONFLICT (id) DO NOTHING;

-- ── Materials ───────────────────────────────────────────────
INSERT INTO public.app_materials (id, name, unit, cost) VALUES
('MAT-001', 'Portland Cement (Type I)', 'bag (94 lb)', 14.50),
('MAT-002', 'Ready-Mix Concrete (4000 PSI)', 'cubic yard', 165.00),
('MAT-003', 'Rebar #4 (1/2")', 'linear foot', 0.85),
('MAT-004', 'Structural Steel W-Beam (W12x26)', 'linear foot', 22.50),
('MAT-005', '2x4 SPF Lumber (8ft)', 'piece', 4.25),
('MAT-006', '5/8" Type X Drywall (4x8)', 'sheet', 16.80),
('MAT-007', 'Romex 12/2 NM-B Wire', 'foot', 0.55),
('MAT-008', '3/4" Copper Pipe (Type L)', 'linear foot', 5.20),
('MAT-009', 'R-19 Fiberglass Insulation (Kraft)', 'sq ft', 0.95),
('MAT-010', 'Standing Seam Metal Roof Panel (24ga)', 'sq ft', 8.75)
ON CONFLICT (id) DO NOTHING;

-- ── Revenue Data ────────────────────────────────────────────
INSERT INTO public.app_revenue_data (id, month, revenue) VALUES
('REV-001', 'Oct 2025', 890000),
('REV-002', 'Nov 2025', 1120000),
('REV-003', 'Dec 2025', 760000),
('REV-004', 'Jan 2026', 1350000),
('REV-005', 'Feb 2026', 1580000),
('REV-006', 'Mar 2026', 1890000)
ON CONFLICT (id) DO NOTHING;

-- ── Notifications ───────────────────────────────────────────
INSERT INTO public.app_notifications (id, message, type, read, time) VALUES
('NOT-001', 'Invoice INV-006 is overdue by 3 days', 'warning', false, '1 hour ago'),
('NOT-002', 'Invoice INV-010 is overdue by 13 days', 'warning', false, '1 hour ago'),
('NOT-003', '5 timesheet entries awaiting approval', 'info', false, '2 hours ago'),
('NOT-004', 'RFI-002 awaiting response for 5 days', 'info', true, '1 day ago'),
('NOT-005', 'Caldwell Retail deadline in 30 days', 'info', true, '2 days ago')
ON CONFLICT (id) DO NOTHING;

-- (pay_applications and line items already inserted above, before lien waivers)
