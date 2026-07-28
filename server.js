const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

const Fee = require('./models/Fee');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const Timetable = require('./models/Timetable');
const Attendance = require('./models/Attendance');
const ClassRoom = require('./models/ClassRoom');
const Admin = require('./models/Admin');
const Subject = require('./models/Subject');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware-ka asaasiga ah
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Ku xirnaanshaha Database-ka iyo bilaabidda Server-ka
mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    family: 4
})
.then(async () => {
    console.log('MongoDB Atlas waxaa lagu guuleystay in lagu xiro!');
    const adminExists = await Admin.findOne();
    if (!adminExists) {
        await Admin.create({ username: 'dalkariim', password: '12345' });
    }

    app.listen(PORT, () => {
        console.log(`Server-ku wuu shaqaynayaa http://localhost:${PORT}`);
    });
})
.catch(err => console.error('Khalad ayaa ka dhacay ku xiridda MongoDB:', err));

app.get('/', (req, res) => {
    res.redirect('/register');
});

// --- REGISTER ---
app.get('/register', (req, res) => {
    res.render('register', { title: 'Isdiiwaangelin - Dalkariim School', error: null });
});

app.post('/register', async (req, res) => {
    const { role, username, password } = req.body;
    
    try {
        if (role === 'admin') {
            let admin = await Admin.findOne();
            if (admin) {
                admin.username = username;
                admin.password = password;
                await admin.save();
            } else {
                await Admin.create({ username, password });
            }
        } else if (role === 'teacher') {
            const existingTeacher = await Teacher.findOne({ username });
            if (!existingTeacher) {
                const newTeacher = new Teacher({ 
                    name: username, 
                    phone: 'Lama hayo', 
                    username: username, 
                    password: password 
                });
                await newTeacher.save();
            }
        }
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.render('register', { title: 'Isdiiwaangelin', error: 'Khalad ayaa dhacay, fadlan dib isku day.' });
    }
});

// --- LOGIN ---
app.get('/login', (req, res) => {
    res.render('login', { title: 'Login - Dalkariim School System', error: null });
});

app.post('/login/admin', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ username, password });
        if (admin) {
            return res.redirect('/admin/dashboard');
        }
        res.render('login', { title: 'Login', error: 'Username ama Password-ka waa qalad!' });
    } catch (err) {
        console.error(err);
        res.render('login', { title: 'Login', error: 'Server Error' });
    }
});

app.post('/login/teacher', async (req, res) => {
    const { username, password } = req.body;
    try {
        const teacher = await Teacher.findOne({ username, password });
        if (teacher) {
            return res.redirect(`/admin/dashboard?teacherName=${encodeURIComponent(teacher.name)}`);
        }
        res.render('login', { title: 'Login', error: 'Username ama Password-ka macallinka waa qalad!' });
    } catch (err) {
        console.error(err);
        res.render('login', { title: 'Login', error: 'Server Error' });
    }
});

// --- FORGOT CREDENTIALS ---
app.get('/forgot-credentials', (req, res) => {
    res.render('forgot-credentials', { title: 'Soo Celinta Xogta - Dalkariim', error: null });
});

app.post('/forgot-credentials', async (req, res) => {
    const { newUsername, newPassword, confirmPassword } = req.body;
    
    if (newPassword !== confirmPassword) {
        return res.render('forgot-credentials', { 
            title: 'Soo Celinta Xogta', 
            error: 'Password-yada aad gelisay isku mid ma aha!'
        });
    }

    try {
        let admin = await Admin.findOne();
        if (admin) {
            admin.username = newUsername;
            admin.password = newPassword;
            await admin.save();
        } else {
            await Admin.create({ username: newUsername, password: newPassword });
        }
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.render('forgot-credentials', { title: 'Soo Celinta Xogta', error: 'Server Error' });
    }
});

// --- SINGLE DASHBOARD ---
app.get('/admin/dashboard', async (req, res) => {
    try {
        const teacherName = req.query.teacherName || null;
        const filter = req.query.filter || null; // Akhriso filtarka la doortay
        
        const studentsCount = await Student.countDocuments();
        const teachersCount = await Teacher.countDocuments();
        const feesCount = await Fee.countDocuments();
        const classesCount = await ClassRoom.countDocuments();
        
        const students = await Student.find({});
        const classes = await ClassRoom.find({});

        // Xisaabi taariikhda iyadoo la eegayo filtarka badhanka
        let dateFilter = {};
        if (filter === 'week') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            dateFilter = { $gte: lastWeek };
        } else if (filter === 'month') {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            dateFilter = { $gte: lastMonth };
        }

        let timetables = [];
        let attendances = [];
        let subjects = [];

        // Samee query-ga xadirinta adoo ku xiraya taariikhda haddii la doortay filtarka
        let attendanceQuery = {};
        if (teacherName) {
            const cleanName = teacherName.trim();
            const teacherRegex = new RegExp(`^${cleanName}$`, 'i');
            attendanceQuery.teacher = teacherRegex;
        }
        if (filter) {
            attendanceQuery.date = dateFilter;
        }

        if (teacherName) {
            const cleanName = teacherName.trim();
            const teacherRegex = new RegExp(`^${cleanName}$`, 'i');
            timetables = await Timetable.find({ teacher: teacherRegex });
            subjects = await Subject.find({ teacher: teacherRegex });
        } else {
            timetables = await Timetable.find({});
            subjects = await Subject.find({});
        }

        attendances = await Attendance.find(attendanceQuery).sort({ date: -1 });

        res.render('admin/dashboard', { 
            title: 'Dashboard-ka Nidaamka',
            teacherName,
            studentsCount, 
            teachersCount,
            feesCount,
            classesCount,
            timetables,
            attendances,
            subjects,
            students,
            classes,
            currentFilter: filter // Ku dar tan si badhanka u shaqeeyo
        }); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- MANAGE CLASSES ---
app.get('/admin/classes', async (req, res) => {
    try {
        const classes = await ClassRoom.find({});
        res.render('admin/classes', { title: 'Maamulka Fasalada', classes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/classes', async (req, res) => {
    try {
        const { className, description } = req.body;
        const newClass = new ClassRoom({ className, description });
        await newClass.save();
        res.redirect('/admin/classes');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/admin/classes/edit/:id', async (req, res) => {
    try {
        const classItem = await ClassRoom.findById(req.params.id);
        if (!classItem) {
            return res.status(404).send('Fasalkan lama helin!');
        }
        res.render('admin/edit-class', { title: 'Wax ka beddelka Fasalka', classItem });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/classes/edit/:id', async (req, res) => {
    try {
        const { className, description } = req.body;
        await ClassRoom.findByIdAndUpdate(req.params.id, { className, description });
        res.redirect('/admin/classes');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/classes/delete/:id', async (req, res) => {
    try {
        await ClassRoom.findByIdAndDelete(req.params.id);
        res.redirect('/admin/classes');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- MANAGE STUDENTS ---
app.get('/admin/students', async (req, res) => {
    try {
        const students = await Student.find({});
        const classes = await ClassRoom.find({});
        res.render('admin/students', { title: 'Maamulka Ardayda', students, classes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/students', async (req, res) => {
    try {
        const { name, classRoom, phone } = req.body;
        const newStudent = new Student({ name, classRoom, phone });
        await newStudent.save();
        res.redirect('/admin/students');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/admin/students/edit/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        const classes = await ClassRoom.find({});
        if (!student) return res.status(404).send('Ardaygan lama helin!');
        res.render('admin/edit-student', { title: 'Wax ka beddelka Ardayga', student, classes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/students/update/:id', async (req, res) => {
    try {
        const { name, classRoom, phone } = req.body;
        await Student.findByIdAndUpdate(req.params.id, { name, classRoom, phone });
        res.redirect('/admin/students');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/students/delete/:id', async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.redirect('/admin/students');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- MANAGE TEACHERS ---
app.get('/admin/teachers', async (req, res) => {
    try {
        const teachers = await Teacher.find({});
        res.render('admin/teachers', { title: 'Maamulka Macallimiinta', teachers });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/teachers', async (req, res) => {
    try {
        const { name, phone, username, password } = req.body;
        const newTeacher = new Teacher({ name, phone, username, password });
        await newTeacher.save();
        res.redirect('/admin/teachers');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/admin/teachers/edit/:id', async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) return res.status(404).send('Macallinkan lama helin!');
        res.render('admin/edit-teacher', { title: 'Wax ka beddelka Macallinka', teacher });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/teachers/update/:id', async (req, res) => {
    try {
        const { name, phone, username, password } = req.body;
        await Teacher.findByIdAndUpdate(req.params.id, { name, phone, username, password });
        res.redirect('/admin/teachers');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/teachers/delete/:id', async (req, res) => {
    try {
        await Teacher.findByIdAndDelete(req.params.id);
        res.redirect('/admin/teachers');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- MANAGE FEES ---
app.get('/admin/fees', async (req, res) => {
    try {
        const fees = await Fee.find({});
        const students = await Student.find({});
        res.render('admin/fees', { title: 'Maamulka Lacagaha', fees, students });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/fees', async (req, res) => {
    try {
        const { studentName, amount, month, date } = req.body;
        const newFee = new Fee({ studentName, amount, month, date });
        await newFee.save();
        res.redirect('/admin/fees');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/admin/fees/edit/:id', async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);
        const students = await Student.find({});
        if (!fee) return res.status(404).send('Lacagtan lama helin!');
        res.render('admin/edit-fee', { title: 'Wax ka beddelka Lacagta', fee, students });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/fees/update/:id', async (req, res) => {
    try {
        const { studentName, amount, month, date } = req.body;
        await Fee.findByIdAndUpdate(req.params.id, { studentName, amount, month, date });
        res.redirect('/admin/fees');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/fees/delete/:id', async (req, res) => {
    try {
        await Fee.findByIdAndDelete(req.params.id);
        res.redirect('/admin/fees');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- MANAGE TIMETABLE ---
app.get('/admin/timetable', async (req, res) => {
    try {
        const timetables = await Timetable.find({});
        const teachers = await Teacher.find({});
        const classes = await ClassRoom.find({});
        res.render('admin/timetable', { title: 'Maamulka Jadawalka', timetables, teachers, classes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/timetable', async (req, res) => {
    try {
        const { day, time, subject, teacher, classRoom } = req.body;
        const newTimetable = new Timetable({ day, time, subject, teacher, classRoom });
        await newTimetable.save();
        res.redirect('/admin/timetable');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/admin/timetable/edit/:id', async (req, res) => {
    try {
        const timetable = await Timetable.findById(req.params.id);
        const teachers = await Teacher.find({});
        const classes = await ClassRoom.find({});
        if (!timetable) return res.status(404).send('Jadwalkan lama helin!');
        res.render('admin/edit-timetable', { title: 'Wax ka beddelka Jadawalka', timetable, teachers, classes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/timetable/update/:id', async (req, res) => {
    try {
        const { day, time, subject, teacher, classRoom } = req.body;
        await Timetable.findByIdAndUpdate(req.params.id, { day, time, subject, teacher, classRoom });
        res.redirect('/admin/timetable');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/timetable/delete/:id', async (req, res) => {
    try {
        await Timetable.findByIdAndDelete(req.params.id);
        res.redirect('/admin/timetable');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- MANAGE SUBJECTS ---
app.get('/admin/subjects', async (req, res) => {
    try {
        const subjects = await Subject.find({});
        const teachers = await Teacher.find({});
        const classes = await ClassRoom.find({});
        res.render('admin/subjects', { title: 'Maamulka Maadooyinka', subjects, teachers, classes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/subjects', async (req, res) => {
    try {
        const { name, classRoom, teacher } = req.body;
        const newSubject = new Subject({ name, classRoom, teacher });
        await newSubject.save();
        res.redirect('/admin/subjects');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/admin/subjects/edit/:id', async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        const teachers = await Teacher.find({});
        const classes = await ClassRoom.find({});
        if (!subject) {
            return res.status(404).send('Maadadan lama helin!');
        }
        res.render('admin/edit-subject', { title: 'Wax ka beddelka Maadada', subject, teachers, classes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/subjects/update/:id', async (req, res) => {
    try {
        const { name, classRoom, teacher } = req.body;
        await Subject.findByIdAndUpdate(req.params.id, { name, classRoom, teacher });
        res.redirect('/admin/subjects');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/subjects/delete/:id', async (req, res) => {
    try {
        await Subject.findByIdAndDelete(req.params.id);
        res.redirect('/admin/subjects');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- ATTENDANCE ---
app.get('/admin/attendance', async (req, res) => {
    try {
        const students = await Student.find({});
        const classes = await ClassRoom.find({});
        const attendances = await Attendance.find({}).sort({ _id: -1 });
        res.render('admin/attendance', { title: 'Xadirinta', students, classes, attendances });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/attendance/mark', async (req, res) => {
    try {
        const { studentName, classRoom, status, teacherName } = req.body;
        const newAttendance = new Attendance({ 
            studentName, 
            teacher: teacherName || 'Macallin', 
            subject: classRoom || 'General', 
            time: new Date().toLocaleTimeString(), 
            status,
            date: new Date() 
        });
        await newAttendance.save();
        
        if (teacherName) {
            return res.redirect(`/admin/dashboard?teacherName=${encodeURIComponent(teacherName)}`);
        }
        res.redirect('/admin/attendance');
    } catch (err) {
        console.error('Attendance Save Error:', err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/attendance/delete/:id', async (req, res) => {
    try {
        await Attendance.findByIdAndDelete(req.params.id);
        res.redirect('/admin/attendance');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/admin/attendance/edit/:id', async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);
        const students = await Student.find({});
        const classes = await ClassRoom.find({});
        if (!attendance) {
            return res.status(404).send('Xadirintan lama helin!');
        }
        res.render('admin/edit-attendance', { title: 'Wax ka beddelka Xadirinta', attendance, students, classes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/attendance/update/:id', async (req, res) => {
    try {
        const { studentName, classRoom, status } = req.body;
        await Attendance.findByIdAndUpdate(req.params.id, { 
            studentName, 
            subject: classRoom || 'General', 
            status 
        });
        res.redirect('/admin/attendance');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});