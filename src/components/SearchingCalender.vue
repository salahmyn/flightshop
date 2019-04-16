<template>
  <v-container>
    <v-layout text-xs-center wrap>
      <v-layout row wrap center>
        <v-flex xs4 v-for="(route, index) in routes" :key="index">
          <v-checkbox
            v-model="route.active"
            :label="`${route.originName} - ${route.destinationName} `"
          ></v-checkbox>
        </v-flex>
      </v-layout>
      <v-flex xs12 center>
        <v-btn color="success" @click="getMonthFlight()">Get Results</v-btn>
        <v-progress-linear :indeterminate="true" v-show="loading"></v-progress-linear>
      </v-flex>
      <v-flex xs12 class="mb-3">
        <v-sheet height="500">
          <v-calendar
            ref="calendar"
            v-model="calenderStart"
            :type="type"
            :end="calenderEnd"
            color="primary"
          >
            <template v-slot:day="{ date }">
              <v-progress-circular
                v-if="(!mappedFlights[date] || !mappedFlights[date].length) && loading && date >= calenderStart && date <= calenderEnd"
                indeterminate
                color="purple"
              ></v-progress-circular>
              <template v-for="(flight , i) in mappedFlights[date]" v-else>
                <v-menu :key="i" v-model="flight.open" full-width offset-x>
                  <template v-slot:activator="{ on }">
                    <div v-ripple class="flight-btn" v-on="on" v-html="flight.text"></div>
                  </template>
                  <v-card color="grey lighten-4" min-width="350px" flat>
                    <v-toolbar color="primary" dark>
                      <v-toolbar-title v-html="flight.text"></v-toolbar-title>
                      <v-spacer></v-spacer>
                      <v-btn icon>
                        <v-icon>favorite</v-icon>
                      </v-btn>
                    </v-toolbar>
                    <v-card-title primary-title>
                      <span v-html="flight.text"></span>
                      <a v-ripple class="v-btn theme--light success" color="success" :href="flight.link" target="_blank">Book Now</a>
                    </v-card-title>
                    <v-card-actions>
                      <v-btn flat color="secondary">Cancel</v-btn>
                    </v-card-actions>
                  </v-card>
                </v-menu>
              </template>
            </template>
          </v-calendar>
        </v-sheet>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { Config } from "../config";
// import axios from "axios";
import { format, addMonths, addDays, isBefore } from "date-fns";
// import unirest from "unirest";
import querystring from "querystring";
import $http from "../http";

export default {
  data: () => ({
    type: "custom-weekly",
    start: new Date(),
    num_requests: 0,
    num_responses: 0,
    routes: [
      {
        origin: "SIN-sky",
        originName: "Singapore Changi",
        destination: "KUL-sky",
        destinationName: "Kuala Lumpur",
        active: true
      },
      {
        origin: "KUL-sky",
        originName: "Kuala Lumpur",
        destination: "SIN-sky",
        destinationName: "Singapore Changi",
        active: true
      },
      {
        origin: "KUL-sky",
        originName: "Singapore Changi",
        destination: "SFO-sky",
        destinationName: "San Francisco International",
        active: true
      }
    ],
    flights: []
  }),
  computed: {
    loading() {
      return (
        this.num_requests !== 0 && this.num_requests !== this.num_responses
      );
    },
    mappedFlights() {
      let map = {};
      this.flights.forEach(e => (map[e.date] = map[e.date] || []).push(e));
      return map;
    },
    calenderStart() {
      return format(this.start, "YYYY-MM-DD");
    },
    end() {
      return addMonths(this.start, 1);
    },
    calenderEnd() {
      return format(this.end, "YYYY-MM-DD");
    }
  },
  methods: {
    getMonthFlight() {
      let vm = this;
      this.routes.forEach((route) => {
        if (route.active) {
          for (
            let today = vm.start;
            isBefore(today, vm.end);
            today = addDays(today, 1)
          ) {
            let formated_today = format(today, "YYYY-MM-DD");
            vm.createSession(route, formated_today);
          }
        }
      });
    },
    async createSession(route, outboundDate) {
      let vm = this;
      vm.num_requests++;
      await $http
        .post(
          Config.EndPoints.CreateSession,
          querystring.stringify({
            outboundDate: outboundDate,
            children: 0,
            infants: 0,
            country: "US",
            currency: "USD",
            locale: "en-US",
            originPlace: route.origin,
            destinationPlace: route.destination,
            adults: "1"
          }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          }
        )
        .then(function(result) {
          vm.num_responses++;

          let location = result.headers.location;

          // let session_id = location.split("/").pop();

          vm.pullResult(location, route, outboundDate);
        })
        .catch(() => {
          // Handel error
          vm.num_responses++;
        });
    },
    async pullResult(location, route, outboundDate, count = 0) {
      let vm = this;
      // fix location (from skyscanner to rapidapi)
      location = location.replace(
        "partners.api.skyscanner.net",
        Config.API_HOST
      );
      location = location.replace("http://", "https://");
      location = location.replace("/uk1/", "/uk2/");

      // sort requested data by price
      // location += '?sortType=price&sortOrder=asc';

      vm.num_requests++;
      await $http
        .get(location)
        .then(function(result) {
          vm.num_responses++;
          // console.log(count, result, result.data);
          if (result.statusText != "OK") {
            // handel the error
            console.log(result);
            return false;
          }
          if (result.data.Status !== "UpdatesComplete" && count < 5) {
            vm.pullResult(location, route, outboundDate, count);
          } else {
            // append
            vm.updateCalender(result.data, route, outboundDate);
          }
        })
        .catch(() => {
          // Handel error
          vm.num_responses++;
        });
    },
    updateCalender(data, route, outboundDate) {
      if (data.Itineraries && data.Itineraries.length) {
        // console.log(data.Itineraries);
        this.flights.push({
          route,
          date: outboundDate,
          text: `${route.originName} - ${route.destinationName} : $${
            data.Itineraries[0].PricingOptions[0].Price
          }`,
          price: data.Itineraries[0].PricingOptions[0].Price,
          link: data.Itineraries[0].PricingOptions[0].DeeplinkUrl
        });
      }
    }
  },
  created() {}
};
</script>

<style>
.flight-btn {
  background-color: #1565c0;
  margin: 5px;
  border: 1px solid #bbdefb;
  color: #fff;
  padding: 3px;
}
</style>
