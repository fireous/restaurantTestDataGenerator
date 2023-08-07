const {
    MSToString,
    intRandom
} = require('../utils/utils.js')

class OrderGenerator {
    get ORDER_FINISH () { return 'finish' }
    get ORDER_CANCEL () { return 'cancel' }
    get ORDER_IN_USE () { return 'in' }
    get ORDER_TAKE_OUT () { return 'out' }

    constructor (dishData, mainDishData, otherDishData, activityDate, tableData, customerData, orderTimeSettings = null) {
        this.dishData = dishData
        this.mainDishData = mainDishData
        this.otherDishData = otherDishData
        this.activityDate = activityDate
        this.tableData = tableData
        this.customerData = customerData

        this.orderTimeSettings = orderTimeSettings

        this.allOreders = {}
        this.allOrederrecords = []
        this.autoOrderId = 1
        this.autoRecordsId = 1
        this.init()
    }

    init () {
        if (this.orderTimeSettings === null) {
            this.orderTimeSettings = {
                base: {
                    waitTime: 60000,
                    processingTime: 300000,
                    dealTime: 60000,
                    cancelTime: 30000,
                    leaveTime: 900000
                },
                range: {
                    waitTime: 300000,
                    processingTime: 300000,
                    dealTime: 300000,
                    cancelTime: 300000,
                    leaveTime: 600000
                }
            }
        }
    }

    #randomDish (categoryDishData) {
        const CategoryKeys = Object.keys(categoryDishData)
        const decideCategory = categoryDishData[CategoryKeys[intRandom(CategoryKeys.length)]]
        return decideCategory[intRandom(decideCategory.length)]
    }

    /**
     * @param {Array<weightObject>} mainDishWeight - An array of main dish weight objects, where each object follows the MainDishWeight structure.
     * @param {Array<weightObject>} otherDishWeight - An array of other dish weight objects, where each object follows the otherDishWeight structure.
     * @typedef {Object} weightObject
     * @property {number} weight - The weight of the main dish. (e.g., 0.1, 0.8, 1)
     * @property {number} amount - The corresponding amount of the main dish. (e.g., 0, 1, 2)
    */
    #randonOrderDetails (peopleNum, mainDishWeight, otherDishWeight) {
        const details = []

        let amountMain = 0
        let amountOther = 0
        for (let i = 0; i < peopleNum; i++) {
            let randomValue = Math.random()
            for (const weightObj of mainDishWeight) {
                if (randomValue > weightObj.weight) {
                    amountMain += weightObj.amount
                }
            }

            randomValue = Math.random()
            for (const weightObj of otherDishWeight) {
                if (randomValue > weightObj.weight) {
                    amountOther += weightObj.amount
                }
            }
        }
        amountMain = amountMain == 0 ? peopleNum : amountMain

        for (; amountMain > 0; amountMain--) {
            details.push(this.#randomDish(this.mainDishData).id)
        }
        for (; amountOther > 0; amountOther--) {
            details.push(this.#randomDish(this.otherDishData).id)
        }
        details.sort(function (a, b) {
            return a - b
        })
        return details
    }

    #checkActivity (order, orderStartTime) {
        let targetActivity = null
        this.activityDate.forEach(activity => {
            if (orderStartTime >= activity.startDate && orderStartTime <= activity.endDate) {
                if (order.amount >= activity.amount) {
                    if (targetActivity) {
                        if (activity.discount > targetActivity.discount) {
                            targetActivity = activity
                        }
                    } else {
                        targetActivity = activity
                    }
                }
            }
        })

        if (targetActivity) {
            order.activityId = targetActivity.id
            if (targetActivity.type == 'discount') {
                order.amount -= targetActivity.discount
            } else if (targetActivity.type == 'gift') {
                order.details.push(targetActivity.FK_Dish_Id)
            }
        }
    }

    #orderrecordCreate (order, orderStartTime) {
        const orderrecords = {
            id: null,
            establish: orderStartTime,
            processing: null,
            deal: null,
            cancel: null,
            finish: null
        }

        const waitDelay = this.orderTimeSettings.base.waitTime + intRandom(this.orderTimeSettings.range.waitTime)
        if (order.status == this.ORDER_FINISH) {
            orderrecords.processing = orderrecords.establish + waitDelay
            orderrecords.deal = orderrecords.processing + this.orderTimeSettings.base.processingTime + intRandom(this.orderTimeSettings.range.processingTime)
            orderrecords.finish = orderrecords.deal + this.orderTimeSettings.base.dealTime + intRandom(this.orderTimeSettings.range.dealTime)
        } else if (order.status == this.ORDER_CANCEL) {
            orderrecords.cancel = orderrecords.establish + this.orderTimeSettings.base.cancelTime + intRandom(this.orderTimeSettings.range.cancelTime)
            if (orderrecords.cancel - orderrecords.establis > waitDelay) {
                orderrecords.processing = orderrecords.establish + waitDelay
            }
        }

        return orderrecords
    }

    orderCreate (peopleNum, orderStartTime, orderStatus, orderType, customerOrTable) {
        const order = {
            id: null,
            status: orderStatus,
            orderStartTime,
            peopleNum,
            details: null,
            amount: 0,
            activityId: null,
            type: orderType,
            leaveTime: null,
            customerOrTable: null,
            phone: null,
            recordsId: null
        }
        order.id = this.autoOrderId++
        this.allOreders[order.id] = order

        const mainDishWeight = [
            { weight: 0.1, amount: 0 },
            { weight: 0.9, amount: 1 },
            { weight: 1, amount: 2 }
        ]
        const otherDishWeight = [
            { weight: 0.1, amount: 0 },
            { weight: 0.9, amount: 1 },
            { weight: 1, amount: 2 }
        ]
        order.details = this.#randonOrderDetails(order.peopleNum, mainDishWeight, otherDishWeight)
        order.details.forEach((id) => {
            order.amount += this.dishData[id - 1].price
        })

        this.#checkActivity(order, orderStartTime)

        const orderrecords = this.#orderrecordCreate(order, orderStartTime)
        order.recordsId = orderrecords

        if (order.status == this.ORDER_CANCEL) {
            order.leaveTime = orderrecords.cancel
        } else {
            if (order.type == this.ORDER_IN_USE) {
                order.customerOrTable = customerOrTable
                order.leaveTime = orderrecords.finish + this.orderTimeSettings.base.leaveTime + intRandom(this.orderTimeSettings.range.leaveTime)
            } else {
                order.customerOrTable = customerOrTable.name
                order.phone = customerOrTable.phone
                order.leaveTime = orderrecords.finish
            }
        }

        return order
    }

    getOrders () {
        const list = []
        const len = Object.keys(this.allOreders).length
        for (let i = 1; i <= len; i++) {
            list.push(this.allOreders[i])
        }
        return list
    }

    getOrederrecordById (id) {
        return this.allOrederrecords[id - 1]
    }

    getOrederrecords () {
        return this.allOrederrecords
    }

    sortOrders () {
        this.autoOrderId = 1
        this.autoRecordsId = 1
        const tempList = Object.values(this.allOreders)
        tempList.sort((a, b) => {
            return a.orderStartTime - b.orderStartTime
        })

        this.allOreders = {}
        this.allOrederrecords = []
        tempList.forEach(order => {
            const record = order.recordsId

            order.id = this.autoOrderId
            this.allOreders[this.autoOrderId++] = order

            order.recordsId = record.id = this.autoRecordsId++
            this.allOrederrecords.push(record)
        })
    }

    popOrderById (id) {
        const data = this.allOreders[id]
        if (data) {
            delete this.allOreders[id]
            return data
        } else {
            return null
        }
    }
}

module.exports = {
    OrderGenerator
}
