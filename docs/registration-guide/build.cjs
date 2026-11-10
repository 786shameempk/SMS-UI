// Builds Registration-Guide-New-Joinee-and-Student.pdf from the screenshots in ./shots.
// Run: node docs/registration-guide/build.cjs   (needs Google Chrome installed; uses playwright-core from node_modules)
const fs = require("fs");
const path = require("path");
const { chromium } = require("../../node_modules/playwright-core");

const here = __dirname;
const img = (n) => "data:image/png;base64," + fs.readFileSync(path.join(here, "shots", n + ".png")).toString("base64");

// A form drawer screenshot (1440x1250, drawer = right-hand 512px) cropped to the drawer, with numbered badges.
// marks: [[number, y-in-screenshot-pixels], ...]
function drawer(file, marks, width = 300) {
  const scale = width / 512, h = Math.round(1250 * scale);
  const badges = marks.map(([n, y]) => `<span class="badge" style="top:${Math.round(y * scale) - 9}px">${n}</span>`).join("");
  return `<div class="dw" style="width:${width}px;height:${h}px"><div class="shot drawer" style="width:${width}px;height:${h}px">
    <img src="${img(file)}" style="width:${Math.round(1440 * scale)}px;margin-left:-${Math.round(928 * scale)}px"></div>${badges}</div>`;
}
// A page screenshot cropped to a region (x, y, w, h in screenshot pixels), scaled to the given width.
function crop(file, x, y, w, h, width = 690, caption = "") {
  const s = width / w;
  return `<figure><div class="shot" style="width:${width}px;height:${Math.round(h * s)}px">
    <img src="${img(file)}" style="width:${Math.round(1440 * s)}px;margin-left:-${Math.round(x * s)}px;margin-top:-${Math.round(y * s)}px"></div>
    ${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
}

const css = `
@page { size: A4; margin: 0 }
* { box-sizing: border-box }
body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; font-size: 11.5px; line-height: 1.5 }
:root { --g: #166534; --g2: #15803d; --soft: #f0fdf4; --line: #e5e7eb }
.page { width: 210mm; height: 297mm; padding: 16mm 15mm 14mm; page-break-after: always; position: relative; overflow: hidden }
.page:last-child { page-break-after: auto }
.foot { position: absolute; left: 15mm; right: 15mm; bottom: 7mm; font-size: 9px; color: #6b7280; display: flex; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 4px }
h1 { font-size: 26px; margin: 0 0 4px; color: var(--g) }
h2 { font-size: 18px; margin: 0 0 6px; color: var(--g); display: flex; align-items: center; gap: 8px }
h3 { font-size: 13px; margin: 14px 0 4px; color: #111827 }
p { margin: 4px 0 }
.tag { display: inline-block; background: var(--g); color: #fff; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 3px 9px; border-radius: 99px }
.cover { background: linear-gradient(160deg, #052e16 0%, #166534 60%, #22c55e 130%); color: #fff; padding: 0 }
.cover .in { padding: 34mm 22mm 0 }
.cover h1 { color: #fff; font-size: 40px; line-height: 1.1; margin: 16px 0 12px }
.cover p { font-size: 15px; color: #dcfce7; max-width: 140mm }
.cover .brand { font-size: 17px; font-weight: 700; letter-spacing: .02em }
.cover .cards { position: absolute; left: 22mm; right: 22mm; bottom: 28mm; display: flex; gap: 12px }
.cover .card { flex: 1; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25); border-radius: 12px; padding: 14px }
.cover .card b { display: block; font-size: 15px; margin-bottom: 4px }
.cover .card span { font-size: 11.5px; color: #dcfce7 }
.grid2 { display: flex; gap: 12px } .grid2 > * { flex: 1 }
.box { border: 1px solid var(--line); border-radius: 10px; padding: 11px 13px; background: #fff }
.box.green { background: var(--soft); border-color: #bbf7d0 }
.box.amber { background: #fffbeb; border-color: #fde68a }
.box b.t { display: block; margin-bottom: 3px }
.steps { display: flex; gap: 16px; align-items: flex-start }
.steps ol { list-style: none; margin: 0; padding: 0; flex: 1 }
.steps li { display: flex; gap: 9px; margin: 0 0 9px }
.n { flex: none; width: 21px; height: 21px; border-radius: 50%; background: var(--g2); color: #fff; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; margin-top: 1px }
.steps li div { flex: 1 } .steps li b { color: #111827 }
.shot { position: relative; overflow: hidden; border: 1px solid #d1d5db; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,.12); background: #fff }
.shot img { display: block; max-width: none }
.dw { position: relative; margin-left: 12px; flex: none }
.badge { position: absolute; left: -12px; width: 20px; height: 20px; border-radius: 50%; background: #e11d48; color: #fff; font-weight: 700; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35) }
figure { margin: 8px 0 } figcaption { font-size: 10px; color: #6b7280; margin-top: 3px; text-align: center }
table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 10.5px }
th { background: var(--g); color: #fff; text-align: left; padding: 5px 8px; font-weight: 600 }
td { padding: 4px 8px; border-bottom: 1px solid var(--line); vertical-align: top }
tr:nth-child(even) td { background: #f9fafb }
.req { color: #be123c; font-weight: 700 }
ul { margin: 4px 0; padding-left: 17px } li { margin: 2px 0 }
.flow { display: flex; align-items: stretch; gap: 6px; margin: 8px 0 }
.flow .f { flex: 1; background: var(--soft); border: 1px solid #bbf7d0; border-radius: 10px; padding: 8px 9px; text-align: center; font-size: 10.5px }
.flow .f b { display: block; color: var(--g); font-size: 11.5px } .flow .a { align-self: center; color: var(--g2); font-weight: 700 }
`;

const foot = (n) => `<div class="foot"><span>School Sphere · Registration guide: new joinees, teachers and students</span><span>Page ${n}</span></div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Registration Guide</title><style>${css}</style></head><body>

<!-- COVER -->
<section class="page cover">
  <div class="in">
    <div class="brand">School Sphere</div>
    <div style="margin-top:42mm"><span class="tag" style="background:#22c55e">Administrator guide</span></div>
    <h1>Registering new joinees,<br>teachers and students</h1>
    <p>A step-by-step walk-through of onboarding a new staff member from Human Resources and enrolling a student from Student Management, with the screens exactly as you will see them.</p>
  </div>
  <div class="cards">
    <div class="card"><b>1 · New joinee / teacher</b><span>Human Resources › Staff Management › New joining</span></div>
    <div class="card"><b>2 · New student</b><span>Academics › Students › Register student</span></div>
  </div>
</section>

<!-- OVERVIEW -->
<section class="page">
  <span class="tag">Overview</span>
  <h1 style="margin-top:8px">What you will do</h1>
  <p>School Sphere has one place for each kind of person. Staff and teachers are registered in <b>Human Resources</b>; students are registered in <b>Academics › Students</b>. Both take about two minutes and automatically prepare the sign-in for the person, so no separate "create user" step is needed.</p>

  <div class="grid2" style="margin-top:12px">
    <div class="box green"><b class="t">New joinee or teacher</b>
      Menu: <b>Human Resources › Staff Management</b><br>Button: <b>New joining</b><br>
      Teachers are staff members whose designation is <b>Teacher</b>. They then appear automatically under <b>Academics › Teachers</b> for class and subject assignment.</div>
    <div class="box green"><b class="t">New student</b>
      Menu: <b>Academics › Students</b><br>Button: <b>Register student</b><br>
      Enrols the student straight into a class and section and records the guardian. Students who are still applying use the <b>Admissions</b> tab instead.</div>
  </div>

  <h3>The journey</h3>
  <div class="flow">
    <div class="f"><b>1. Sign in</b>as administrator</div><div class="a">›</div>
    <div class="f"><b>2. Open the screen</b>Staff or Students</div><div class="a">›</div>
    <div class="f"><b>3. Fill the form</b>one side panel</div><div class="a">›</div>
    <div class="f"><b>4. Save</b>ID is generated</div><div class="a">›</div>
    <div class="f"><b>5. Login ready</b>invitation sent</div>
  </div>

  <h3>Before you start</h3>
  <div class="grid2">
    <div class="box"><b class="t">For a new joinee</b><ul>
      <li>Full name, date of birth, gender</li>
      <li>Designation (Teacher, Accountant, Librarian, …)</li>
      <li>Department the person belongs to</li>
      <li>A mobile number and/or email address</li>
      <li>Residential address</li></ul></div>
    <div class="box"><b class="t">For a new student</b><ul>
      <li>Full name, date of birth, gender</li>
      <li>Class and section already created for the branch</li>
      <li>Residential address</li>
      <li>Guardian name, relation and mobile number</li>
      <li>Optional: student email, parent email</li></ul></div>
  </div>

  <h3>Signing in</h3>
  <p>Open the school's School Sphere address and sign in with your administrator account (email and password, or an OTP if your school has enabled it). Staff and student registration is available to <b>Administrators</b> and <b>Principals</b>.</p>
  ${crop("00-login", 720, 60, 720, 480, 330, "The sign-in page.")}
  ${foot(2)}
</section>

<!-- PART 1: STAFF, page 1 -->
<section class="page">
  <span class="tag">Part 1</span>
  <h2 style="margin-top:6px">Register a new joinee or teacher (Human Resources)</h2>
  <h3>1 · Open Staff Management</h3>
  <p>In the left menu choose <b>Human Resources</b>. The <b>Staff Management</b> page lists every staff member with their designation, department, status and <b>Login account</b> state. Select the green <b>New joining</b> button at the top right.</p>
  ${crop("02-staff", 256, 300, 1184, 120, 690, "Human Resources › Staff Management. “New joining” opens the registration panel.")}
  <h3>2 · Fill in the New joining panel</h3>
  <div class="steps">
    ${drawer("04-staff-dialog-filled", [[1, 178], [2, 325], [3, 403], [4, 549], [5, 666], [6, 893], [7, 1036], [8, 1218]], 268)}
    <ol>
      <li><span class="n">1</span><div><b>Branch</b>: the campus the person will work at. It is pre-selected for single-campus schools.</div></li>
      <li><span class="n">2</span><div><b>First name</b> and <b>Last name</b>.</div></li>
      <li><span class="n">3</span><div><b>Date of birth</b> and <b>Gender</b>.</div></li>
      <li><span class="n">4</span><div><b>Designation / Role</b>: choose <b>Teacher</b> for a teacher (or Principal, Accountant, Librarian, Receptionist, …). Then pick the <b>Department</b>.</div></li>
      <li><span class="n">5</span><div><b>Reporting person</b>: who approves this person's profile changes. The default, <i>Department head (suggested)</i>, is right for most joinees.</div></li>
      <li><span class="n">6</span><div><b>Mobile number</b> and <b>Email</b>: these create the sign-in (see next page).</div></li>
      <li><span class="n">7</span><div><b>Address</b>: required.</div></li>
      <li><span class="n">8</span><div>Select <b>Add staff member</b>. The message <i>“Staff member added”</i> confirms it.</div></li>
    </ol>
  </div>
  ${foot(3)}
</section>

<!-- PART 1: STAFF, page 2 -->
<section class="page">
  <span class="tag">Part 1 · continued</span>
  <h2 style="margin-top:6px">After saving: the new joinee is ready</h2>
  ${crop("06-staff-list-after", 256, 0, 1184, 500, 690, "The new staff member appears at the top of the list with an employee ID (here EMP-1012) and “Account linked”.")}
  <div class="grid2">
    <div class="box green"><b class="t">What happens automatically</b><ul>
      <li>An <b>employee ID</b> is generated (EMP-xxxx).</li>
      <li>The status is set to <b>Active</b> with today as the joining date.</li>
      <li>A <b>staff login</b> is created and linked, so the column shows <b>Account linked</b>.</li>
      <li>With an <b>email</b>: an invitation is sent to set a password. With a <b>mobile number</b>: the person can sign in with a one-time code. With neither: no login is created, and it can be linked later.</li></ul></div>
    <div class="box"><b class="t">Teachers</b>
      A joinee registered with the designation <b>Teacher</b> also appears under <b>Academics › Teachers</b>, where you assign subjects and classes. Until assigned, Subjects and Classes show 0.</div>
  </div>
  ${crop("16-teachers", 256, 240, 1184, 190, 690, "Academics › Teachers lists the new teacher, ready for subject and class assignment.")}

  <h3>Check or manage the login</h3>
  <div class="steps">
    <div style="flex:1.1">${crop("08-staff-login-tab", 288, 120, 1120, 360, 400, "Staff profile › Login tab.")}</div>
    <div style="flex:1;padding-top:6px">
      <p>Select the staff member's name to open the profile. The tabs hold <b>Overview, Qualifications &amp; Experience, Salary, Attendance, Performance and Documents</b>.</p>
      <p>The <b>Login</b> tab (administrators) shows the linked sign-in. <b>Unlink</b> separates it if the wrong account was linked. Records created without an email or mobile number can be linked here later.</p>
    </div>
  </div>
  ${foot(4)}
</section>

<!-- PART 2: STUDENT, page 1 -->
<section class="page">
  <span class="tag">Part 2</span>
  <h2 style="margin-top:6px">Register a new student (Student Management)</h2>
  <h3>1 · Open Students</h3>
  <p>From the left menu choose <b>Academics</b>; the <b>Students</b> tab opens first. The page lists each student with class, roll number, status, guardian and <b>Login account</b> state. Select <b>Register student</b> at the top right.</p>
  ${crop("09-students", 256, 300, 1184, 120, 690, "Academics › Students. “Register student” opens the form; “Import” is for bulk enrolment from a file.")}
  <h3>2 · Fill in the Register student panel</h3>
  <div class="steps">
    ${drawer("11-student-dialog-filled", [[1, 198], [2, 345], [3, 423], [4, 569], [5, 716], [6, 842], [7, 928], [8, 1003], [9, 1218]], 268)}
    <ol>
      <li><span class="n">1</span><div><b>Branch</b>: the campus where the student is enrolled.</div></li>
      <li><span class="n">2</span><div><b>First name</b> and <b>Last name</b>.</div></li>
      <li><span class="n">3</span><div><b>Date of birth</b> and <b>Gender</b>.</div></li>
      <li><span class="n">4</span><div><b>Class</b>, then <b>Section</b>, and an optional <b>Roll number</b>. Classes and sections come from Academic Setup.</div></li>
      <li><span class="n">5</span><div><b>Address</b>: required.</div></li>
      <li><span class="n">6</span><div><b>Guardian name</b>, <b>Relation</b> (father, mother or guardian) and <b>Guardian mobile</b>.</div></li>
      <li><span class="n">7</span><div><b>Student email</b> / <b>Student mobile</b> (optional): creates the student's own sign-in.</div></li>
      <li><span class="n">8</span><div><b>Parent email</b> (optional): creates the parent sign-in for the Parent Portal and app.</div></li>
      <li><span class="n">9</span><div>Select <b>Register student</b>. The message <i>“Student registered”</i> confirms it.</div></li>
    </ol>
  </div>
  ${foot(5)}
</section>

<!-- PART 2: STUDENT, page 2 -->
<section class="page">
  <span class="tag">Part 2 · continued</span>
  <h2 style="margin-top:6px">After saving: the student is on the roll</h2>
  ${crop("13-students-after", 256, 240, 1184, 380, 690, "Searching for the new student: admission number EDU-2026-0059, Grade 3 - A, roll 21, “Account linked”.")}
  <div class="grid2">
    <div class="box green"><b class="t">What happens automatically</b><ul>
      <li>An <b>admission number</b> is generated (EDU-year-number).</li>
      <li>The student is placed in the chosen <b>class and section</b> with status <b>Active</b>.</li>
      <li>The <b>guardian</b> is saved against the student.</li>
      <li>Each email gives a login: <b>student email</b> → student login, <b>parent email</b> → parent login, both linked, with an invitation to set a password. A mobile number signs in with a one-time code.</li>
      <li>If the parent already has a login (a brother or sister is enrolled), the new student is <b>linked to it</b> instead of creating a second one.</li></ul></div>
    <div class="box"><b class="t">Open the student record</b>
      Select the student's name for a quick view: admission number, roll number, date of birth, admission date and address, plus <b>Guardians</b> and <b>Health</b> tabs. <b>Open full profile</b> shows everything, and <b>Edit</b> changes details later.</div>
  </div>
  ${crop("15-student-profile", 993, 0, 447, 400, 300, "Student quick view.")}

  <h3>Other ways to add students</h3>
  <table>
    <tr><th style="width:26%">Method</th><th>When to use it</th></tr>
    <tr><td><b>Admissions</b> tab</td><td>The child is applying. Track enquiry → exam → interview → fee → decision, then register.</td></tr>
    <tr><td><b>Import</b> button</td><td>Enrolling many students at once from a prepared file.</td></tr>
  </table>
  ${foot(6)}
</section>

<!-- QUICK REFERENCE -->
<section class="page">
  <span class="tag">Quick reference</span>
  <h1 style="margin-top:8px">Field checklist and tips</h1>

  <h3>New joining (staff / teacher)</h3>
  <table>
    <tr><th style="width:24%">Field</th><th style="width:12%">Required</th><th>Notes</th></tr>
    <tr><td>Branch</td><td class="req">Yes</td><td>Pre-selected when the school has one campus.</td></tr>
    <tr><td>First name, Last name</td><td class="req">Yes</td><td></td></tr>
    <tr><td>Date of birth, Gender</td><td class="req">Yes</td><td>Male, Female or Other.</td></tr>
    <tr><td>Designation / Role</td><td class="req">Yes</td><td>Teacher, Principal, Accountant, Librarian, Receptionist and other roles your school defines.</td></tr>
    <tr><td>Department</td><td>Select one</td><td>Choose the person's department. Departments are maintained by your administrator.</td></tr>
    <tr><td>Reporting person</td><td>Optional</td><td>Receives the joinee's profile-change requests for approval. With none, they go to the school administrators.</td></tr>
    <tr><td>Mobile number, Email</td><td>Optional</td><td>At least one is needed to create a sign-in.</td></tr>
    <tr><td>Address</td><td class="req">Yes</td><td></td></tr>
  </table>

  <h3>Register student</h3>
  <table>
    <tr><th style="width:24%">Field</th><th style="width:12%">Required</th><th>Notes</th></tr>
    <tr><td>Branch</td><td class="req">Yes</td><td></td></tr>
    <tr><td>First name, Last name</td><td class="req">Yes</td><td></td></tr>
    <tr><td>Date of birth, Gender</td><td class="req">Yes</td><td></td></tr>
    <tr><td>Class, Section</td><td class="req">Yes</td><td>The class and section must already exist for the branch.</td></tr>
    <tr><td>Roll number</td><td>Optional</td><td>Leave blank if you do not use roll numbers.</td></tr>
    <tr><td>Address</td><td class="req">Yes</td><td></td></tr>
    <tr><td>Guardian name, Relation, Guardian mobile</td><td class="req">Yes</td><td>Relation: father, mother or guardian.</td></tr>
    <tr><td>Student email / mobile, Parent email</td><td>Optional</td><td>Each one creates a sign-in. Leave blank to create logins later.</td></tr>
  </table>

  <div class="grid2" style="margin-top:10px">
    <div class="box amber"><b class="t">Good to know</b><ul>
      <li>Leave email and mobile blank when you do not want a login yet. You can link one later from the profile's <b>Login</b> tab.</li>
      <li>Red messages under a field tell you what is missing; the panel will not save until they clear.</li>
      <li>If a name, email or mobile already has a login, the screen tells you rather than creating a duplicate.</li></ul></div>
    <div class="box green"><b class="t">Also from the Staff screen</b><ul>
      <li><b>Promote</b>: change designation with an effective date</li>
      <li><b>Record resignation</b> / <b>Reactivate</b></li>
      <li><b>Import</b>: bulk onboarding from a file</li>
      <li><b>Leave Requests</b> tab: staff leave approvals</li></ul></div>
  </div>
  ${foot(7)}
</section>

</body></html>`;

(async () => {
  fs.writeFileSync(path.join(here, "guide.html"), html);
  const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const p = await b.newPage();
  await p.goto("file:///" + path.join(here, "guide.html").replace(/\\/g, "/"));
  await p.waitForTimeout(800);
  await p.pdf({ path: path.join(here, "..", "Registration-Guide-New-Joinee-and-Student.pdf"), format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await b.close();
  console.log("done");
})();
