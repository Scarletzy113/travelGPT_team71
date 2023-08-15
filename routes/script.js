document.getElementById('goButton').addEventListener('click', function() {
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const pax = document.getElementById('pax').value;

    // Dummy flight prices for demonstration
    const flightPrices = [
        { airline: 'Airline A', price: '$300' },
        { airline: 'Airline B', price: '$350' },
        // Add more flight prices here
    ];

    const flightPricesContainer = document.getElementById('flightPrices');
    flightPricesContainer.innerHTML = '';

    flightPrices.forEach(flight => {
        const flightEntry = document.createElement('div');
        flightEntry.classList.add('flight-entry');
        flightEntry.innerHTML = `<div class="airline">${flight.airline}</div>
                                 <div class="price">${flight.price}</div>`;
        flightPricesContainer.appendChild(flightEntry);
    });
});
