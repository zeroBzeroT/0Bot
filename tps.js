module.exports = init

function init() {
    return inject
}

function inject(bot) {
    let time = parseInt(bot.time.age)
    const calcTps = []
    function run(bot) {
        time = parseInt(bot.time.age)
        setTimeout(() => {
            const diff = parseInt(bot.time.age) - time

            calcTps.push(diff)
            if (calcTps.length > 60) {
                calcTps.shift()
            }
            run(bot)
        }, 1000)
    }
    run(bot)

    bot.getTps = function () {
        return Math.round(calcTps.filter(tps => tps >= 20).length / calcTps.length * 20 * 10) / 10
        //return Math.round(calcTps.reduce((a, b) => a + b, 0) / calcTps.length * 10) / 10;
    }
}