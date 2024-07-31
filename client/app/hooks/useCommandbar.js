import { init } from "commandbar";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import { useEffect } from "react";
init('df71a85c');

export const useCommandBar = () => {
  
  // I didn't bother getting the current user id since it isn't technically necessary to showcase 
  // commandbar functionality... to record the loom I didn't need commandbar to differentiate between users.
  // To do it properly I would find a way to either subscribe to auth changes and update the user id accordingly,
  // OR move the CommandBar.boot({{userid}}) code to a page that is only accessible after login. and then another 
  // CommandBar.shutdown() in the logout function... let me know if you want me to poke around some more for how
  // to do this properly.
  useEffect(() => {
    const loggedInUserId = "12345";
    window.CommandBar.boot(loggedInUserId);
    return () => {
      window.CommandBar.shutdown();
    };
  }, []);

  // using redash search API to retrieve saved queries
  useEffect(() => {
    const onSearchQueries = async (query) => {
      const response = await fetch(`/api/queries?order&page=1&page_size=20&q=${query}`);
      
      return (await response.json()).results;
    };
    window.CommandBar.addRecords("queries", [], {
      onInputChange: onSearchQueries,
    });}
  , []);
  
  // adding the router to use for navigation
  useEffect(() => {
    function router(url) {
      navigateTo(url);
    }
    window.CommandBar.addRouter(router);
  }, []);
};