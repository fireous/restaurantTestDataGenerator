class CheckoutGenerator {
    constructor () {
        this.checkouts = []
    }

    checkoutCreate (payStatus, createTime, payTime, orderId) {
        const checkout = {
            id: null,
            payStatus,
            createTime,
            payTime,
            FK_orderId: orderId
        }
        this.checkouts.push(checkout)
    }

    getCheckouts () {
        return this.checkouts
    }

    sortCheckouts () {
        this.checkouts.sort((a, b) => {
            return a.createTime - b.createTime
        })
        this.checkouts.forEach((checkout, idx) => {
            checkout.id = idx + 1
        })
    }
}

module.exports = {
    CheckoutGenerator
}
