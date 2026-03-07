// import { useAsgardeo } from "@asgardeo/react";

// export const authApi = () => {
//   const {
//     signIn,
//     signOut,
//     isSignedIn,
//     getAccessToken,
//     getDecodedIdToken,
//     // getBasicUserInfo
//   } = useAsgardeo();

//   return {
//     login: signIn,
//     logout: signOut,

//     getSession: async () => {
//       if (!isSignedIn) return null;

//       return {
//         accessToken: await getAccessToken(),
//         idToken: await getDecodedIdToken(),
//         // user: await getBasicUserInfo()
//       };
//     },

//     isAuthenticated: isSignedIn
//   };
// }
