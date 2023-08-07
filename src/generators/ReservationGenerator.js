const {
    MSToString,
    intRandom
} = require('../utils/utils.js')

class ReservationGenerator {
    get DAY_IN_MILLISECONDS () { return 86400000 }
    get HOUR_IN_MILLISECONDS () { return 3600000 }
    get MINUTE_IN_MILLISECONDS () { return 60000 }

    get CANCEL_RESERVATION () { return 'cancel_reservation' }
    get FINISH_RESERVATION () { return 'finish_reservation' }

    constructor (OrderGenerator, tableData, customerData, mealDuration, reservationLeadDay) {
        this.OrderGenerator = OrderGenerator

        this.tableData = tableData
        this.customerData = customerData

        // mealDuration = "01:30"
        this.mealDuration = new Date(`1970-01-01T${mealDuration}:00Z`).getTime()
        this.reservationLeadTime = reservationLeadDay * this.DAY_IN_MILLISECONDS

        this.allReservations = []
    }

    #checkTable (pNumber, startTime) {
        const currReservations = []
        this.allReservations.forEach(reservation => {
            if (reservation.startTime == startTime) {
                currReservations.push(reservation)
                reservation.FK_FdTableBean_Id.forEach(id => {
                    this.tableData[id - 1].isReservation = true
                })
            }
        })

        const tableId = []
        while (pNumber > 0) {
            const maxTable = this.tableData.reduce((max, data) => {
                if (!data.isReservation) {
                    if (max == null || data.capacity > max.capacity) {
                        return data
                    } else if (data.capacity >= max.capacity) {
                        return intRandom(2) > 0 ? data : max
                    }
                }
                return max
            }, null)
            if (maxTable === null) {
                tableId.length = 0
                break
            }
            tableId.push(maxTable.id)
            pNumber -= maxTable
        }

        this.tableData.forEach(data => {
            data.isReservation = false
        })
        return tableId
    }

    createReservation (orderStartTime, cancelWeight) {
        const customer = this.customerData[intRandom(this.customerData.length)]
        const reservation = {
            id: null,
            pNumber: 0,
            status: null,
            date: null,
            startTime: null,
            endTime: null,
            submitTime: null,
            FK_FdTableBean_Id: [],
            orderStart: null,
            actualEndTime: null,
            name: customer.name,
            phone: customer.phone,
            gender: customer.gender,
            email: null,
            note: null
        }

        reservation.pNumber = 2 + intRandom(9)

        reservation.status = Math.random() > cancelWeight ? this.FINISH_RESERVATION : this.CANCEL_RESERVATION

        reservation.date = Math.floor(orderStartTime / this.DAY_IN_MILLISECONDS) * this.DAY_IN_MILLISECONDS
        reservation.startTime = Math.floor(orderStartTime / this.HOUR_IN_MILLISECONDS) * this.HOUR_IN_MILLISECONDS
        reservation.endTime = reservation.startTime + this.mealDuration

        // time
        const todayTime = orderStartTime % this.DAY_IN_MILLISECONDS
        reservation.submitTime = orderStartTime - this.HOUR_IN_MILLISECONDS - intRandom(this.reservationLeadTime + todayTime)

        // order create ...
        reservation.FK_FdTableBean_Id = this.#checkTable(reservation.pNumber, reservation.startTime)
        if (reservation.status == this.FINISH_RESERVATION) {
            if (reservation.FK_FdTableBean_Id.length != 0) {
                let tempNumber = reservation.pNumber
                reservation.orderStart = orderStartTime
                const orders = []
                for (const tableId of reservation.FK_FdTableBean_Id) {
                    const capacity = this.tableData[tableId - 1].capacity
                    const orderPNumber = tempNumber > capacity ? capacity : tempNumber
                    tempNumber -= capacity
                    const order = this.OrderGenerator.orderCreate(
                        orderPNumber,
                        orderStartTime + intRandom(5 * this.MINUTE_IN_MILLISECONDS),
                        this.OrderGenerator.ORDER_FINISH,
                        this.OrderGenerator.ORDER_IN_USE,
                        tableId)
                    orders.push(order)
                }

                orders.forEach(order => {
                    if (reservation.actualEndTime === null) {
                        reservation.actualEndTime = order.leaveTime
                    } else if (order.leaveTime > reservation.actualEndTime) {
                        reservation.actualEndTime = order.leaveTime
                    }
                })
            } else {
                return null
            }
        }

        this.allReservations.push(reservation)
        return reservation
    }

    sortReservation () {
        this.allReservations.sort((a, b) => {
            return a.submitTime - b.submitTime
        })
        let autoId = 1
        this.allReservations.forEach(data => {
            data.id = autoId++
        })
    }

    getReservation () {
        return this.allReservations
    }
}

module.exports = {
    ReservationGenerator
}
