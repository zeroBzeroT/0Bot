module.exports = init;

function init() {
    return inject;
}

function inject(bot) {
    let time = parseInt(bot.time.age);
    const calcTps = [];

    function run(bot1) {
        time = parseInt(bot1.time.age);
        setTimeout(() => {
            const diff = parseInt(bot1.time.age) - time;

            calcTps.push(diff);
            if (calcTps.length > 60) {
                calcTps.shift();
            }
            run(bot1);
        }, 1000);
    }

    run(bot);

    bot.getTps = function () {
        return Math.round(calcTps.filter(tps => tps >= 20).length / calcTps.length * 20 * 10) / 10.0;
    };
}