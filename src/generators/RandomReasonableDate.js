const {
    MSToString,
    intRandom
} = require('../utils/utils.js')

class OrderDateGenerator {
    get DAY_IN_MILLISECONDS () { return 86400000 }
    get HOUR_IN_MILLISECONDS () { return 3600000 }
    get MINUTE_IN_MILLISECONDS () { return 60000 }

    get IS_DAYS () { return 'days' }
    get IS_PERIOD () { return 'period' }

    constructor (startDate, endDate, openingHoursData, vacationTime = []) {
        this.startDate = new Date(`${startDate}T00:00:00Z`).getTime()
        this.endDate = new Date(`${endDate}T00:00:00Z`).getTime()
        this.openingHoursData = JSON.parse(JSON.stringify(openingHoursData))
        this.vacationTime = vacationTime

        // Calculate the total number of days between the start and end dates and store it as a property.
        this.totalDays = (this.endDate - this.startDate) / this.DAY_IN_MILLISECONDS
        this.dayOfWeekTotal = {}
        this.haveVacationDay = []
        this.allOrderDate = {}
        this.init()
    }

    init () {
    // Adds vacation dates (excluding time) to a list.
        if (this.vacationTime.length != 0) {
            this.vacationTime = JSON.parse(JSON.stringify(this.vacationTime))
            this.vacationTime.forEach(closeTime => {
                const start = closeTime.start - (closeTime.start % this.DAY_IN_MILLISECONDS)
                const end = closeTime.end - (closeTime.end % this.DAY_IN_MILLISECONDS)

                if (start == end) {
                    this.haveVacationDay.push(start)
                } else {
                    const vacationTotalDays = Math.floor((end - start) / this.DAY_IN_MILLISECONDS)
                    for (let i = 0; i < vacationTotalDays; i++) {
                        this.haveVacationDay.push(start + i * this.DAY_IN_MILLISECONDS)
                    }
                }
            })

            this.vacationTime.sort(function (a, b) {
                return a.start - b.start
            })
        }

        Object.keys(this.openingHoursData).forEach(key => {
            const dayData = this.openingHoursData[key]
            this.dayOfWeekTotal[key] = 0

            for (let i = 0; i < dayData.length; i++) {
                dayData[i].total = (dayData[i].close - dayData[i].open)
                this.dayOfWeekTotal[key] += dayData[i].total
            }

            dayData.sort(function (a, b) {
                return a.open - b.open
            })
        })
    }

    // Checks if the given dateMillisecond is within the vacation period.
    #checkVacationTime (dateMillisecond) {
        if (this.vacationTime) {
            this.vacationTime.forEach(vTime => {
                if (dateMillisecond >= vTime.start && dateMillisecond < vTime.end) {
                    return true
                }
            })
        }
        return false
    }

    // Checks if the given dateMillisecond corresponds to a vacation day.
    #checkVacationDay (dateMillisecond) {
        if (this.vacationTime) {
            if (this.haveVacationDay.includes(dateMillisecond)) {
                return true
            }
        }
        return false
    }

    #setVacationTime (mode, extraDays, maxVacationDays) {
        let vacationTimeDay = this.startDate
        let vacationTimeStartDate
        let vacationTimeEndDate
        let currentDay
        const haveVacationDayNewList = []

        // Get a randomly generated date.
        while (true) {
            let temp = vacationTimeDay
            temp += intRandom(this.totalDays + extraDays) * this.DAY_IN_MILLISECONDS
            currentDay = new Date(temp).getDay().toString()

            // Checks if the randomly generated date is outside of business hours and falls on another vacation day.
            if (!Object.keys(this.openingHoursData).includes(currentDay)) {
                continue
            }
            if (this.#checkVacationDay(temp)) {
                continue
            }

            vacationTimeDay = temp
            break
        }

        if (mode == this.IS_PERIOD) {
            let openingData = this.openingHoursData[currentDay]
            openingData = openingData[intRandom(openingData.length)]
            vacationTimeStartDate = vacationTimeDay + openingData.open
            vacationTimeEndDate = vacationTimeDay + openingData.close
            haveVacationDayNewList.push(vacationTimeDay)
        } else if (mode == this.IS_DAYS) {
            vacationTimeStartDate = vacationTimeDay
            vacationTimeEndDate = vacationTimeDay
            const days = intRandom(maxVacationDays)
            haveVacationDayNewList.push(vacationTimeDay)
            for (let i = 0; i < days; i++) {
                vacationTimeEndDate += this.DAY_IN_MILLISECONDS
                const day = new Date(vacationTimeEndDate).getDay().toString()

                if (this.#checkVacationDay(vacationTimeEndDate) || !Object.keys(this.openingHoursData).includes(day)) {
                    break
                }
                haveVacationDayNewList.push(vacationTimeEndDate)
            }
        } else {
            const errorMessage = { message: "Error argument 'vacationTimeMode' is invalid" }
            throw errorMessage
        }

        this.haveVacationDay.push(...haveVacationDayNewList)
        this.vacationTime.push({
            start: vacationTimeStartDate,
            end: vacationTimeEndDate
        })
    }

    #getDate () {
        let currentDate = this.startDate
        let currentDay
        let isReasonableDate

        // day
        isReasonableDate = false
        while (isReasonableDate == false) {
            let temp = currentDate
            temp += intRandom(this.totalDays) * this.DAY_IN_MILLISECONDS
            currentDay = new Date(temp).getDay().toString()

            if (!Object.keys(this.openingHoursData).includes(currentDay)) {
                continue
            }
            if (this.#checkVacationTime(temp)) {
                continue
            }

            isReasonableDate = true

            currentDate = temp
        }

        // time
        isReasonableDate = false
        while (isReasonableDate == false) {
            let temp = intRandom(this.dayOfWeekTotal[currentDay])
            for (let i = 0; i < this.openingHoursData[currentDay].length; i++) {
                temp -= this.openingHoursData[currentDay][i].total
                if (temp <= 0) {
                    temp += this.openingHoursData[currentDay][i].close
                    break
                }
            }

            temp += currentDate

            if (this.#checkVacationTime(temp)) {
                continue
            }

            isReasonableDate = true
            currentDate = temp
        }

        return currentDate
    }

    setVacationTimeByTimes (times) {
        for (let i = 0; i < times; i++) {
            const mode = intRandom(2) == 0 ? this.IS_DAYS : this.IS_PERIOD
            this.#setVacationTime(mode, 30, 7)
        }
        this.vacationTime.sort(function (a, b) {
            return a.start - b.start
        })
        this.vacationTime.forEach((data, idx) => {
            data.id = idx + 1
        })
    }

    getVacationTimeData () {
        return this.vacationTime
    }

    setOrderDateByTimes (times) {
        const temp = [...Object.values(this.allOrderDate)]
        for (let i = 0; i < times; i++) {
            temp.push(this.#getDate())
        }
        temp.sort(function (a, b) {
            return a - b
        })
        temp.forEach((data, idx) => {
            this.allOrderDate[idx + 1] = data
        })
    }

    getOrderDates () {
        return this.allOrderDate
    }

    getOrderDateById (id) {
        return this.allOrderDate[id]
    }

    popOrderDateById (id) {
        const value = this.allOrderDate[id]
        delete this.allOrderDate[id]
        return value
    }

    clearOrderDates () {
        this.allOrderDate = {}
    }
}

module.exports = {
    OrderDateGenerator
}
