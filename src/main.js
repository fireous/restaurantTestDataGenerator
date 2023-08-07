const { OrderDateGenerator } = require('./generators/RandomReasonableDate.js')
const { ReservationGenerator } = require('./generators/ReservationGenerator.js')
const { OrderGenerator } = require('./generators/OrderGenerator.js')
const { CheckoutGenerator } = require('./generators/CheckoutGenerator.js')

const {
    MSToString,
    intRandom
} = require('./utils/utils.js')

const {
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
} = require('./utils/readJsonData.js')

const dataGenerator = new OrderDateGenerator('2023-01-01', '2023-07-31', openingHoursData, closeTimeData)
const orderGenerator = new OrderGenerator(dishData, mainDishData, otherDishData, activityDate, tableData, customerData)
const reservationGenerator = new ReservationGenerator(orderGenerator, tableData, customerData, '01:00', 7)
const checkoutGenerator = new CheckoutGenerator()

dataGenerator.setOrderDateByTimes(3000)
const heldTime = 10 * dataGenerator.MINUTE_IN_MILLISECONDS
Object.values(dataGenerator.getOrderDates()).forEach(date => {
    if (heldTime > date % reservationGenerator.HOUR_IN_MILLISECONDS) {
        reservationGenerator.createReservation(date, 0.1)
    }
})
reservationGenerator.sortReservation()

dataGenerator.clearOrderDates()
dataGenerator.setOrderDateByTimes(1000)

const tableUseRecord = []
reservationGenerator.allReservations.forEach(reservation => {
    if (reservation.status == reservationGenerator.FINISH_RESERVATION) {
        tableUseRecord.push({
            tableIds: reservation.FK_FdTableBean_Id,
            startTime: reservation.startTime,
            leaveTime: reservation.actualEndTime
        })
    }
})

function findTable (tables, numPeople) {
    const bestTables = []
    let minWaste = Infinity
    tables.forEach(table => {
        if (table.capacity >= numPeople) {
            if ((table.capacity - numPeople) < minWaste) {
                bestTables.length = 0
                bestTables.push(table)
                minWaste = table.capacity - numPeople
            } else if ((table.capacity - numPeople) == minWaste) {
                bestTables.push(table)
            }
        }
    })

    return bestTables.length > 0 ? bestTables[intRandom(bestTables.length)] : null
}

Object.values(dataGenerator.getOrderDates()).forEach(date => {
    const removeIdx = []
    tableUseRecord.forEach((record, idx) => {
        if (date >= record.startTime && date <= record.leaveTime) {
            record.tableIds.forEach(id => {
                tableData[id - 1].isUsed = true
            })
        }
        if (date > record.leaveTime) {
            record.tableIds.forEach(id => {
                tableData[id - 1].isUsed = false
            })
            removeIdx.push(idx)
        }
    })
    removeIdx.reverse().forEach(idx => {
        tableUseRecord.splice(idx, 1)
    })
    removeIdx.length = 0

    const notUseTables = tableData.reduce((list, data) => {
        if (!data.isUsed) {
            list.push(data)
        }
        return list
    }, [])

    const pNumber = intRandom(4) + 1
    const orderStatus = Math.random() > 0.05 ? orderGenerator.ORDER_FINISH : orderGenerator.ORDER_CANCEL
    const currTable = findTable(notUseTables, pNumber)
    let takeOut = false
    if (currTable) {
        const order = orderGenerator.orderCreate(
            pNumber,
            date,
            orderStatus,
            orderGenerator.ORDER_IN_USE,
            currTable.id)

        tableUseRecord.forEach(record => {
            if (record.tableIds.includes(order.customerOrTable)) {
                if (record.startTime < order.leaveTime) {
                    orderGenerator.popOrderById(order.id)
                    takeOut = true
                }
            }
        })
    }
    if (takeOut) {
        const order = orderGenerator.orderCreate(
            pNumber,
            date,
            orderStatus,
            orderGenerator.ORDER_TAKE_OUT,
            customerData[intRandom(customerData.length)])
    }
})
orderGenerator.sortOrders()
orderGenerator.getOrders().forEach(order => {
    if (order.status == orderGenerator.ORDER_FINISH) {
        const record = orderGenerator.getOrederrecordById(order.recordsId)
        checkoutGenerator.checkoutCreate('Y', record.processing, record.finish, order.id)
    }
})
checkoutGenerator.sortCheckouts()

// millisecond to string
const reservationData = reservationGenerator.getReservation()
reservationData.forEach(data => {
    data.date = new MSToString(data.date).getYMD()
    data.startTime = new MSToString(data.startTime).getHm()
    data.endTime = new MSToString(data.endTime).getHm()
    data.submitTime = new MSToString(data.submitTime).getAll()
    data.orderStart = new MSToString(data.orderStart).getAll()
    data.actualEndTime = new MSToString(data.actualEndTime).getAll()
})

const orderData = orderGenerator.getOrders()
orderData.forEach(data => {
    data.orderStartTime = new MSToString(data.orderStartTime).getAll()
    data.leaveTime = new MSToString(data.leaveTime).getAll()
})

const orderrecordsData = orderGenerator.getOrederrecords()
orderrecordsData.forEach(data => {
    Object.keys(data).forEach(key => {
        if (key != 'id' && data[key]) {
            data[key] = new MSToString(data[key]).getAll()
        }
    })
})

const checkoutData = checkoutGenerator.getCheckouts()
checkoutData.forEach(data => {
    data.createTime = new MSToString(data.createTime).getAll()
    data.payTime = new MSToString(data.payTime).getAll()
})

// output data
const PATH = './src/data/generated_data/'
fs.writeFileSync(PATH + 'reservations.json', JSON.stringify(reservationData, null, '\t'))
fs.writeFileSync(PATH + 'orders.json', JSON.stringify(orderData, null, '\t'))
fs.writeFileSync(PATH + 'orderrecords.json', JSON.stringify(orderrecordsData, null, '\t'))
fs.writeFileSync(PATH + 'checkout.json', JSON.stringify(checkoutData, null, '\t'))
