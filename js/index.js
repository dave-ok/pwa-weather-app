// TODO: transfer to firebase functions
const API_KEY = "f3893cd33d19506354f252a28d96885c";

const decodeResponse = async (response) => {
  switch (response.status) {
    case 200: {
      const data = await response.json();
      return {
        status: "success",
        data
      }
    }
    case 401:
      return {
        status: "error",
        error: "Invalid API key specified"
      }
      
    case 404:
      return {
        status: "error",
        error: "Requested location was not found"
      }

    case 429:
      return {
        status: "error",
        error: "Too many requests. Try again later"
      }
  
    default:
      return {
        status: "error",
        error: "Invalid request"
      }
  }
}

// get coordinates using city from current weather
const fetchCurrentWeather = async (city) => {
  try {
    //base url
    const baseUrl = "https://api.openweathermap.org/data/2.5/weather";

    // init common params
    const params = {
      appid: API_KEY,
      units: "metric",
      q: city
    }

    const url = new URL(baseUrl);  

    // append query params
    url.search = new URLSearchParams(params);

    const response = await fetch(url);

    return decodeResponse(response);  
    
  }
  catch (error) {
    return {
      status: "error",
      error: error.message
    }
  }

}

//fetch 7-day forecast
const fetchLiveForecast = async (location = 'New York', mode = "city") => {  
  try {
    //base url
    const baseUrl = "https://api.openweathermap.org/data/2.5/onecall";

    // init common params
    const params = {
      appid: API_KEY,
      units: "metric",
      exclude: "minutely,hourly"
    }

    const url = new URL(baseUrl);

    if (mode === "coord") {
      params.lat = location.lat;
      params.lon = location.lon;
    }
    // if not coordinates then must be city
    else {
      const cityData = await fetchCurrentWeather(location);

      // if an error occured getting city rethrow the error
      if (cityData.error) {
        throw new Error(cityData.error);
      }
      // get coordinates from weather
      params.lat = cityData.data.coord.lat;
      params.lon = cityData.data.coord.lon;
    }

    // append query params
    url.search = new URLSearchParams(params);

    const response = await fetch(url);    
    return decodeResponse(response);
  }
  catch (error) {
    return {
      status: "error",
      error: error.message
    }

  }
}


//request location permission


//cache search result


// button click handler
const btnSearch = document.querySelector("#btn-get-forecast");
const inputSearch = document.querySelector("#search-input");

btnSearch.addEventListener("click", async () => {
  console.log(inputSearch.value);
  const result = await fetchLiveForecast(inputSearch.value);

  if (result.status === "success") {
    console.log(result.data);
  }
  else if (result.status === "error") {
    console.log(result.error);
  }
})