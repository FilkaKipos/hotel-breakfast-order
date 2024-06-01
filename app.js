const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

let orderData = {};
let orders = {};

// Сброс данных каждый день в 05:00 по московскому времени
const resetOrders = () => {
    orders = {};
    console.log('Orders reset at 05:00 MSK');
};

// Установка планировщика
schedule.scheduleJob('0 5 * * *', resetOrders);

// Вспомогательная функция для проверки интервала
const isTimeConflict = (existingTime, newTime, interval) => {
    const existing = new Date(`1970-01-01T${existingTime}:00Z`).getTime();
    const newT = new Date(`1970-01-01T${newTime}:00Z`).getTime();
    return Math.abs(newT - existing) < interval * 60000;
};

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/hot_meal', (req, res) => {
    const { guestName, roomNumber, breakfastTime, breakfastCount } = req.body;

    // Проверка на уникальность номера
    if (orders[roomNumber]) {
        return res.send('Ошибка. Завтрак в этот номер уже заказали.');
    }

    // Проверка на интервал времени между всеми заказами
    for (let room in orders) {
        for (let order of orders[room]) {
            if (isTimeConflict(order.breakfastTime, breakfastTime, 10)) {
                return res.send('Ошибка. Разница между завтраками должна быть минимум 10 минут');
            }
        }
    }

    orders[roomNumber] = [{ guestName, breakfastTime, breakfastCount }];

    orderData = req.body;
    res.render('hot_meal', { breakfastCount: req.body.breakfastCount });
});

app.post('/hot_drink', (req, res) => {
    Object.assign(orderData, req.body);
    res.render('hot_drink', { breakfastCount: orderData.breakfastCount });
});

app.post('/cold_drink', (req, res) => {
    Object.assign(orderData, req.body);
    res.render('cold_drink', { breakfastCount: orderData.breakfastCount });
});

app.post('/dessert', (req, res) => {
    Object.assign(orderData, req.body);
    res.render('dessert', { breakfastCount: orderData.breakfastCount });
});

app.post('/summary', (req, res) => {
    Object.assign(orderData, req.body);
    res.render('summary', { orderData });
});

app.post('/submit', (req, res) => {
    Object.assign(orderData, req.body);

    const transporter = nodemailer.createTransport({
        host: 'smtp.mail.ru',
        port: 465,
        auth: { 
            user: 'z.1@zavtraki2321.bizml.ru', 
            pass: 'TaRhDcfpMhq8VVU3ccmd' },
        secure: true
    });

    const mailOptions = {
        from: 'z.1@zavtraki2321.bizml.ru',
        to: 'rezidreta228@gmail.com',
        subject: 'Новый завтрак',
        text: JSON.stringify(orderData, null, 2)
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        res.send('Вы успешно записались на завтрак.');
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
