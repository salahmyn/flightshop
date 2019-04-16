<template>
  <v-app>
    <v-toolbar app>
      <v-toolbar-title class="headline text-uppercase">
        <span>
            <v-icon size="30">flight_takeoff</v-icon>
        </span>
        <span class="font-weight-light">Flights Calendar</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        flat
        href="https://github.com/vuetifyjs/vuetify/releases/latest"
        target="_blank"
      >
        <span class="mr-2">Info</span>
      </v-btn>
    </v-toolbar>
    <v-content>
      <SearchingCalender/>
    </v-content>
  </v-app>
</template>

<script>
import SearchingCalender from './components/SearchingCalender'

export default {
  name: 'App',
  components: {
    SearchingCalender
  },
  data () {
    return {
      //
    }
  }
}
</script>
