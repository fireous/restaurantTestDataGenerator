// ==== read Data
const fs = require('fs')

const PATH = './src/data/basic_data/'

const categoryData = JSON.parse(fs.readFileSync(PATH + 'category.json'))

const dishData = JSON.parse(fs.readFileSync(PATH + 'dish.json'))

let openingHoursData = JSON.parse(fs.readFileSync(PATH + 'openingHours.json'))

let closeTimeData = JSON.parse(fs.readFileSync(PATH + 'closingTime.json'))

const tableData = JSON.parse(fs.readFileSync(PATH + 'fdtable.json'))

const activityDate = JSON.parse(fs.readFileSync(PATH + 'activity.json'))

const customerData = JSON.parse(fs.readFileSync(PATH + 'customer.json'))

// ==== edit capacity Data

// 0 is sunday
openingHoursData = ((data) => {
    const dayGroups = {}

    data.forEach((openHour) => {
        const day = openHour.day
        if (!dayGroups[day]) {
            dayGroups[day] = []
        }
        openHour.open = new Date(`1970-01-01T${openHour.open}:00Z`).getTime()
        openHour.close = new Date(`1970-01-01T${openHour.close}:00Z`).getTime()
        dayGroups[day].push(openHour)
    })
    return dayGroups
})(openingHoursData)

closeTimeData = ((data) => {
    data.forEach((closeTime) => {
        const startTime = closeTime.start.split(' ')
        const endTime = closeTime.end.split(' ')
        closeTime.start = new Date(`${startTime[0]}T${startTime[1]}Z`).getTime()
        closeTime.end = new Date(`${endTime[0]}T${endTime[1]}Z`).getTime()
    })
    return data
})(closeTimeData)

// tableData
tableData.forEach(data => {
    data.isUsed = false
    data.isReservation = false
})

// activityDate
for (const data of activityDate) {
    data.startDate = new Date(data.startDate).getTime()
    data.endDate = new Date(data.endDate).getTime()
}
activityDate.sort(function (a, b) {
    return a.startDate - b.startDate
})

// Group dishes by category
const mainDishData = {}
const otherDishData = {}

function groupMainByCategory (...mainCategoryIds) {
    categoryData.forEach((category) => {
        if (mainCategoryIds.includes(category.id)) {
            mainDishData[category.id] = []
        } else {
            otherDishData[category.id] = []
        }
    })

    dishData.forEach((dish) => {
        if (mainCategoryIds.includes(dish.category)) {
            mainDishData[dish.category].push(dish)
        } else {
            otherDishData[dish.category].push(dish)
        }
    })
}
groupMainByCategory(1, 2, 3)

module.exports = {
    fs,
    categoryData,
    dishData,
    openingHoursData,
    closeTimeData,
    tableData,
    activityDate,
    customerData,
    mainDishData,
    otherDishData
}
