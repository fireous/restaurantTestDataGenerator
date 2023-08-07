class MSToString {
    constructor (millisecond) {
        this.millisecond = millisecond
    }

    // get yyyy-MM-DD HH-mm-ss
    getAll () {
        return new Date(this.millisecond).toISOString().slice(0, 19).replace('T', ' ')
    }

    // get yyyy-MM-DD
    getYMD () {
        return new Date(this.millisecond).toISOString().slice(0, 10)
    }

    // get HH-mm
    getHm () {
        return new Date(this.millisecond).toISOString().slice(11, 16)
    }

    // get HH-mm-ss
    getHms () {
        return new Date(this.millisecond).toISOString().slice(11, 19)
    }
}

// get 0 ~ max
function intRandom (max) {
    return Math.floor(Math.random() * max)
}

module.exports = {
    MSToString,
    intRandom
}
