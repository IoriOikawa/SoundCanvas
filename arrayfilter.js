// A Filter that can take multiple inputs at a time.
function ArrayFilter(n) {
    this.filters = [];
    for (let i = 0; i < n; i++) {
        this.filters.push(new Filter());
    }
}

// Concatenate each filtered input into an objects of arrays.
ArrayFilter.prototype.update = function(xx) {
    const res = {};
    for (let i = 0; i < this.filters.length; i++) {
        const point = this.filters[i].update(xx[i]);
        Object.keys(point).forEach((key) => {
            if (!res[key]) res[key] = [];
            res[key].push(point[key]);
        });
    }
    return res;
}
