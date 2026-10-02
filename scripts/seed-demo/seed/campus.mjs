// CampusService, per branch: library, transport, hostel, inventory, health, visitors, help desk, certificates.
import { ADULT_FEMALE, ADULT_MALE, SURNAMES, addDays, iso } from "../lib.mjs";
import { hasRows } from "./context.mjs";

export async function seedCampus(ctx) {
  const { s, t, b, bi, ti, r, S, bulk, today, TODAY } = ctx;
  const phone = () => `9${r.int(100000000, 999999999)}`;

  await S("Library Management", "library catalogue, members & loans", async () => {
    if (await hasRows(s, "campus", "/api/books")) return "already there";
    const cats = {};
    for (const name of ["Fiction", "Science", "History", "Reference", "Children"]) cats[name] = await s.post("campus", "/api/bookcategories", { name });
    const pubs = [];
    for (const name of ["Penguin India", "NCERT", "Rupa Publications", "HarperCollins India"]) pubs.push(await s.post("campus", "/api/publishers", { name, address: "New Delhi" }));
    const books = [
      ["The Guide", "R. K. Narayan", "Fiction"], ["Malgudi Days", "R. K. Narayan", "Children"], ["Wings of Fire", "A. P. J. Abdul Kalam", "Science"],
      ["The Discovery of India", "Jawaharlal Nehru", "History"], ["Panchatantra Stories", "Vishnu Sharma", "Children"], ["The God of Small Things", "Arundhati Roy", "Fiction"],
      ["Science Class 8", "NCERT", "Reference"], ["Mathematics Class 9", "NCERT", "Reference"], ["Ignited Minds", "A. P. J. Abdul Kalam", "Science"],
      ["The Room on the Roof", "Ruskin Bond", "Fiction"], ["Oxford School Atlas", "Oxford", "Reference"], ["India After Gandhi", "Ramachandra Guha", "History"],
    ];
    const authors = {};
    const created = [];
    for (const [i, [title, author, cat]] of books.entries()) {
      authors[author] ??= await s.post("campus", "/api/authors", { name: author, bio: null });
      // ISBNs stay unique across tenants and branches.
      created.push(await s.post("campus", "/api/books", { title, isbn: `978${8100000000 + ti * 100000 + bi * 1000 + i * 7}`, authorId: authors[author].id, publisherId: r.pick(pubs).id, categoryId: cats[cat].id, totalCopies: r.int(2, 6), shelfLocation: `${cat[0]}-${r.int(1, 9)}`, coverNote: null }));
    }
    const memberPeople = [...r.shuffle(ctx.students).slice(0, 20).map((x) => ["Student", x.id]), ...ctx.teachers.slice(0, 5).map((x) => ["Staff", x.id])];
    const members = (await bulk(memberPeople, ([personType, personId]) => s.post("campus", "/api/librarymembers", { personType, personId, status: "Active" }))).out.filter(Boolean);
    let loans = 0;
    for (const m of members.slice(0, 12)) {
      const loan = await s.post("campus", "/api/bookloans/issue", { bookId: r.pick(created).id, memberId: m.id, dueDate: iso(addDays(today, r.int(-5, 14))) }).catch(() => null);
      if (loan) {
        loans++;
        if (r.chance(0.3)) await s.post("campus", `/api/bookloans/${loan.id}/return`).catch(() => {});
      }
    }
    // Reservations need a title with no copies left - seed/extras.mjs lends one out fully, then reserves it.
    return `${created.length} titles, ${members.length} members, ${loans} loans`;
  });

  await S("Transport Management", "transport: buses, drivers, routes & students", async () => {
    if (await hasRows(s, "campus", "/api/buses")) return "already there";
    const drivers = ctx.byRole("Driver");
    const buses = [];
    for (let i = 0; i < 2; i++) buses.push(await s.post("campus", "/api/buses", { regNumber: `${t.vehiclePrefix}-${String(1 + bi).padStart(2, "0")}-F-${r.int(1000, 9999)}`, model: r.pick(["Tata Starbus", "Ashok Leyland Lynx", "Eicher Skyline"]), capacity: 40, manufactureYear: r.int(2018, 2024), gpsDeviceId: `GPS-${t.subdomain}-${b.code}-${i + 1}`, status: "Active" }));
    const profiles = [];
    for (const d of drivers) profiles.push(await s.post("campus", "/api/driverprofiles", { staffId: d.id, licenseNumber: `${t.vehiclePrefix}${r.int(10, 99)} ${r.int(2005, 2020)}${r.int(1000000, 9999999)}`, licenseExpiryDate: "2030-06-30", experienceYears: r.int(4, 20), status: "Active" }));
    const places = r.shuffle(t.localities);
    const routeDefs = [
      ["Route 1 - North loop", ["School gate", ...places.slice(0, 3)]],
      ["Route 2 - South loop", ["School gate", ...places.slice(3, 6)]],
    ];
    let assigned = 0;
    const riders = r.shuffle(ctx.students).slice(0, 16);
    for (const [i, [name, stops]] of routeDefs.entries()) {
      const route = await s.post("campus", "/api/transportroutes", { name, busId: buses[i]?.id ?? null, driverId: profiles[i]?.id ?? null, startTime: "07:00", endTime: "08:15", status: "Active" });
      const stopRows = [];
      for (const [k, stop] of stops.entries()) stopRows.push(await s.post("campus", "/api/routestops", { routeId: route.id, name: stop, arrivalTime: `07:${String(10 + k * 15).padStart(2, "0")}`, landmark: null }));
      for (const st of riders.slice(i * 8, i * 8 + 8)) {
        await s.post("campus", "/api/studenttransportassignments", { studentId: st.id, routeId: route.id, stopId: r.pick(stopRows.slice(1)).id, monthlyFee: 1200 });
        assigned++;
      }
    }
    return `${buses.length} buses, ${profiles.length} drivers, ${routeDefs.length} routes, ${assigned} riders`;
  });

  await S("Hostel Management", "hostel: rooms, allocations & attendance", async () => {
    if (await hasRows(s, "campus", "/api/hostels")) return "already there";
    const warden = ctx.byRole("Warden")[0];
    const hostel = await s.post("campus", "/api/hostels", { name: `${b.name.replace(/ Campus$/, "")} Hostel`, type: "CoEd", wardenStaffId: warden?.id ?? null, address: "Inside campus, Block C", status: "Active" });
    const rooms = [];
    for (let i = 1; i <= 6; i++) rooms.push(await s.post("campus", "/api/rooms", { hostelId: hostel.id, roomNumber: `${i <= 3 ? "G" : "F"}${i}`, floor: i <= 3 ? "Ground" : "First", capacity: 4, roomType: "Dormitory", status: "Active" }));
    const seniorFrom = t.grades[Math.max(0, t.grades.length - 3)];
    const boarders = r.shuffle(ctx.students.filter((x) => x.grade >= seniorFrom)).slice(0, 12);
    for (const [i, st] of boarders.entries()) await s.post("campus", "/api/hostelallocations", { studentId: st.id, hostelId: hostel.id, roomId: rooms[i % rooms.length].id, monthlyFee: 6500 });
    await s.call("campus", "PUT", "/api/hostelattendance", { date: TODAY, entries: boarders.map((st) => ({ studentId: st.id, status: r.next() < 0.9 ? "Present" : "OnLeave" })) });
    await s.post("campus", "/api/hostelfeepayments/generate", { month: TODAY.slice(0, 7) });
    return `${rooms.length} rooms, ${boarders.length} boarders`;
  });

  await S("Inventory Management", "inventory: stock, vendors, purchases & issues", async () => {
    if (await hasRows(s, "campus", "/api/inventoryitems")) return "already there";
    const cats = {};
    for (const [name, description] of [["Stationery", "Paper, pens, registers"], ["Lab equipment", "Science lab supplies"], ["Sports", "Sports gear"], ["Cleaning", "Housekeeping supplies"]]) cats[name] = await s.post("campus", "/api/itemcategories", { name, description });
    const vendors = [];
    for (const name of ["Sri Lakshmi Stationers", "City Scientific Co.", "Sportz Hub"]) vendors.push(await s.post("campus", "/api/vendors", { name, contactPerson: `${r.pick(ADULT_MALE)} ${r.pick(SURNAMES)}`, phone: phone(), email: null, address: t.city }));
    const items = [
      ["A4 paper (500 sheets)", "Stationery", "Ream", 260, 20], ["Whiteboard markers", "Stationery", "Box", 180, 10], ["Attendance registers", "Stationery", "Piece", 90, 15],
      ["Beakers 250 ml", "Lab equipment", "Piece", 120, 12], ["Litmus paper", "Lab equipment", "Packet", 45, 10], ["Footballs", "Sports", "Piece", 650, 4],
      ["Cricket kit", "Sports", "Set", 3200, 1], ["Floor cleaner", "Cleaning", "Litre", 110, 20],
    ];
    for (const [i, [name, cat, unit, cost, reorder]] of items.entries()) {
      const item = await s.post("campus", "/api/inventoryitems", { code: `${b.code}-${String(i + 1).padStart(3, "0")}`, name, categoryId: cats[cat].id, unit, unitCost: cost, reorderLevel: reorder, location: "Store room" });
      await s.post("campus", "/api/stocktransactions/purchase", { itemId: item.id, quantity: reorder * r.int(2, 5), unitCost: cost, vendorId: r.pick(vendors).id, date: iso(addDays(today, -r.int(10, 40))), reference: `PO-${r.int(100, 999)}` });
      if (r.chance(0.7)) await s.post("campus", "/api/stocktransactions/issue", { itemId: item.id, quantity: r.int(1, reorder), issuedTo: r.pick([ctx.sections[0].label, "Science Lab", "Sports room", "Office"]), reason: null, date: iso(addDays(today, -r.int(1, 9))) });
    }
    return `${items.length} items, ${vendors.length} vendors`;
  });

  await S("Health & Medical", "health: check-ups, vaccinations & infirmary", async () => {
    if (await hasRows(s, "campus", "/api/healthcheckups")) return "already there";
    const nurse = ctx.byRole("Nurse")[0];
    const kids = r.shuffle(ctx.students);
    await bulk(kids.slice(0, 25), (st) => s.post("campus", "/api/healthcheckups", { studentId: st.id, checkupDate: iso(addDays(today, -r.int(5, 40))), heightCm: 110 + st.grade * 5 + r.int(-6, 6), weightKg: 20 + Math.round(st.grade * 3.5) + r.int(-4, 5), visionLeft: r.pick(["6/6", "6/6", "6/9"]), visionRight: r.pick(["6/6", "6/6", "6/9"]), dentalRemarks: r.chance(0.2) ? "Minor cavity - advised dentist visit" : null, generalRemarks: "Healthy", examinedByStaffId: nurse?.id ?? null }));
    await bulk(kids.slice(25, 37), (st) => s.post("campus", "/api/vaccinationrecords", { studentId: st.id, vaccineName: r.pick(["Tdap booster", "HPV", "Typhoid"]), doseNumber: 1, dueDate: iso(addDays(today, r.int(-20, 30))), notes: null }));
    await bulk(kids.slice(37, 43), (st) => s.post("campus", "/api/infirmaryvisits", { studentId: st.id, visitedAt: addDays(today, -r.int(0, 10)).toISOString(), symptoms: r.pick(["Headache", "Stomach ache", "Minor cut on knee", "Mild fever"]), temperatureC: r.pick([36.8, 37.2, 38.1]), treatmentGiven: r.pick(["Rest", "First aid", "Paracetamol given"]), medicineGiven: null, outcome: r.pick(["ReturnedToClass", "ReturnedToClass", "SentHome"]), parentNotified: r.chance(0.5), attendedByStaffId: nurse?.id ?? null }));
    return "25 check-ups, 12 vaccinations, 6 infirmary visits";
  });

  await S("Visitor Management", "visitors & gate log", async () => {
    if (await hasRows(s, "campus", "/api/visitorentries")) return "already there";
    const host = r.pick(ctx.teachers);
    for (let i = 0; i < 2; i++) await s.post("campus", "/api/preapprovedvisits", { visitorName: `${r.pick(ADULT_MALE)} ${r.pick(SURNAMES)}`, phone: phone(), purpose: r.pick(["Meeting", "Interview"]), purposeNotes: null, hostType: "Staff", hostStudentId: null, hostStaffId: host.id, hostOtherLabel: null, scheduledAt: addDays(today, i + 1).toISOString() });
    const entries = [];
    for (let i = 0; i < 5; i++) {
      const st = r.pick(ctx.students);
      entries.push(await s.post("campus", "/api/visitorentries", { visitorName: `${r.pick(ADULT_FEMALE)} ${st.last}`, phone: phone(), idProofType: "Aadhaar", idProofNumber: `XXXX-XXXX-${r.int(1000, 9999)}`, purpose: r.pick(["Pickup", "Meeting", "Delivery"]), purposeNotes: null, hostType: "Student", hostStudentId: st.id, hostStaffId: null, hostOtherLabel: null, preApprovalId: null }));
    }
    for (const e of entries.slice(0, 3)) await s.post("campus", `/api/visitorentries/${e.id}/check-out`);
    return "2 pre-approved, 5 check-ins (3 checked out)";
  });

  await S("Complaint / Help Desk", "help desk tickets", async () => {
    if (await hasRows(s, "campus", "/api/tickets")) return "already there";
    const defs = [
      ["Facilities", "High", "Projector not working in Room 104", "The projector does not turn on since Monday."],
      ["Transport", "Medium", "Bus arrives late at the last stop", "The Route 2 bus has been 15 minutes late this week."],
      ["ItSupport", "Low", "Wi-Fi slow in the library", "Students cannot open the e-library portal."],
      ["FeesBilling", "Medium", "Fee receipt not received", "Paid online but did not get the receipt."],
      ["Academic", "Low", "Request for extra maths class", "Parents request remedial classes before exams."],
    ];
    const staffer = ctx.byRole("Receptionist")[0] ?? ctx.teachers[0];
    for (const [i, [category, priority, subject, description]] of defs.entries()) {
      const st = r.pick(ctx.students);
      const tk = await s.post("campus", "/api/tickets", { category, priority, subject, description, raisedByType: i % 2 ? "Parent" : "Staff", raisedByStudentId: i % 2 ? st.id : null, raisedByStaffId: i % 2 ? null : staffer.id, raisedByName: i % 2 ? `Parent of ${st.first} ${st.last}` : `${staffer.first} ${staffer.last}`, raisedByContact: null });
      if (i < 3) await s.post("campus", `/api/tickets/${tk.id}/assign`, { staffId: staffer.id });
      if (i < 2) await s.post("campus", `/api/tickets/${tk.id}/resolve`, { resolutionNotes: "Fixed and verified with the requester." });
    }
    return `${defs.length} tickets`;
  });

  await S("Certificate Generator", "certificates", async () => {
    if (await hasRows(s, "campus", "/api/issuedcertificates")) return "already there";
    for (const st of r.shuffle(ctx.students).slice(0, 3)) {
      await s.post("campus", "/api/issuedcertificates", { type: "Bonafide", recipientType: "Student", recipientId: st.id, recipientName: `${st.first} ${st.last}`, recipientSubtitle: `Grade ${st.grade}`, bodyLines: [`This is to certify that ${st.first} ${st.last} is a bonafide student of ${t.school}, ${b.name}, studying in Grade ${st.grade} during the academic year ${ctx.yearCfg.name}.`], meta: [], certificateNumberOverride: null });
    }
    return "3 bonafide certificates";
  });
}
