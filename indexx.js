import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onChildAdded,
  onValue,
  update,
  get,
  child,
  remove
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyAniLYa3rcEQiSmDwzTmkbjevQsKGF74t8",
  authDomain: "test-entry.firebaseapp.com",
  databaseURL: "https://sun-synk.asia-southeast1.firebasedatabase.app/",
  projectId: "test-entry",
  storageBucket: "test-entry.appspot.com",
  messagingSenderId: "770605036085",
  appId: "1:770605036085:web:53eeb0dd5cc5a3ca"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase();
const functions = getFunctions();

const storage = getStorage(app);
const uploadImg = document.getElementById("uploadImg");
const imagePreview = document.getElementById("image-preview");


let currentChatKey = '';
// insert 1st time staff data in rtdb
let staffUid;
let staffName;


let customerDetailsDiv = document.getElementById('customerDetailsDiv');
const customerMcDetails = (cid) => {
  const getCustomerMcDetails = httpsCallable(functions, 'getCustomerMcDetails');
  getCustomerMcDetails(cid).then(result => {
    const customerMcData = result.data;
    if (customerMcData) {
      console.log(customerMcData);
      let msn = document.createElement('p');
      msn.classList.add('msn');
      msn.id = 'msn';
      msn.textContent = `Machine SN: ${customerMcData.msn}`;
      let pnm = document.createElement('p');
      pnm.classList.add('pnm');
      pnm.id = 'pnm';
      pnm.textContent = `Product: ${customerMcData.pnm}`;
      let idt = document.createElement('p');
      idt.classList.add('idt');
      idt.id = 'idt';
      idt.textContent = `Install/Pusrchase date: ${customerMcData.idt}`;
      customerDetailsDiv.appendChild(msn);
      customerDetailsDiv.appendChild(pnm);
      customerDetailsDiv.appendChild(idt);
    }
    else {
      alert("No customer machine details found!")
    }

  })
}


let playNewchatReqSound = () => {
  let newChatReqSound = new Audio('./audio/newChatReq.mp3');
  newChatReqSound.play();
}
let playchatEndSound = () => {
  let playchatEndSound = new Audio('./audio/chatEndAudio.mp3');
  playchatEndSound.play();
}
let chatWarning = () => {
  let endChatClick = new Audio('./audio/endChatClickAudio.wav');
  endChatClick.play();
}

const updateStaffStatus = async (uid, name, status, email) => {
  const dbref = ref(db);
  await get(child(dbref, "operators/" + uid)).then((snapshot) => {
    if (!snapshot.exists()) {
      set(ref(db, "operators/" + uid), {
        em: email,
        st: status,
        nm: name,
      })
        .then(() => {
          console.log('staff status updated successfully.');
        })
        .catch((error) => {
          console.error('Error status updated:', error);
        });
    }
  })
    .catch((error) => {
      alert("Unsuccessful, error " + error);
    })
}
const userName = document.getElementById('userName')
const userEmail = document.getElementById('userEmail')
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log(user);
    userName.textContent = user.displayName;
    userEmail.textContent = user.email;
    console.log(user.uid);
    staffUid = user.uid;
    staffName = user.displayName;
    updateStaffStatus(user.uid, user.displayName, "free", user.email);
    loadOldMsg(user.uid);
    loadQuickChatMsgs();
  } else {
    // User is signed out, clear the username
    userName.textContent = "";
    userEmail.textContent = "";
  }
});

//dispaly new messages to staff
let chatMessages = document.getElementById("chat-box");
let displayMessages = (newMessage) => {
  let messageElement = document.createElement("div");
  messageElement.classList.add("message");

  let senderElement = document.createElement("div");
  senderElement.classList.add("nmMsgTm");
  const date = new Date(newMessage.tm);
  const hours = date.getHours() % 12 || 12;
  const minutes = date.getMinutes();
  const session = date.getHours() >= 12 ? 'PM' : 'AM';
  const trimmedTime = `${hours}:${minutes} ${session}`;
  senderElement.innerHTML = `<span class='senderName'>${newMessage.nm} : <span class='msgName'>${newMessage.msg}</span></span><span class='time'>${trimmedTime}</span>`
  messageElement.appendChild(senderElement);
  if (newMessage.img) {
    let imgDiv = document.createElement("div");
    imgDiv.classList.add("imgDisplayDiv");
    let img = document.createElement('img');
    img.src = newMessage.img;
    img.classList.add('customerImg');
    img.onclick = function () {
      toggleFullscreen(this);
    };

    imgDiv.appendChild(img);
    messageElement.appendChild(imgDiv);
  }
  chatMessages.appendChild(messageElement);

  // Scroll to the bottom of the chat box
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

const toggleFullscreen = (element) => {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}




// show new chat request to staff

const reList = document.getElementById('reList');
const chatRef = ref(db, "chats");
onValue(chatRef, (snapshot) => {
  reList.innerHTML = "";
  // console.log("new chat reqest");
  snapshot.forEach((childSnapshot) => {
    const chatKey = childSnapshot.key;
    // console.log(chatKey);
    const chat = childSnapshot.val();
    if (chat.st === "waiting") {
      const li = document.createElement('li');
      li.classList.add('notification-item')
      const div = document.createElement('div');
      const nameLabel = document.createElement('label');
      nameLabel.textContent = `Name:`;
      const nameSpan = document.createElement('span');
      nameSpan.textContent = chat.cnm;
      div.appendChild(nameLabel);
      div.appendChild(nameSpan);

      // Create the label for Message
      const messageLabel = document.createElement('label');
      messageLabel.textContent = 'Message:';
      const messageSpan = document.createElement('span');
      //get the first message
      get(ref(db, `chats/${chatKey}/messages`))
        .then((snapshot) => {
          const messages = snapshot.val();
          for (const messageId in messages) {
            const message = messages[messageId];
            messageSpan.textContent = message.msg;
            break;
          }
        })
        .catch((error) => {
          console.log("Error while fetching first messege!", error);
        });

      li.appendChild(div);
      li.appendChild(messageLabel);
      li.appendChild(messageSpan);
      reList.appendChild(li);

      li.addEventListener('click', async () => {
        console.log("accepte event happend");
        // staffUid
        let staffSt;
        const dbref = ref(db);
        await get(child(dbref, "operators/" + staffUid)).then((snapshot) => {
          if (snapshot.exists()) {
            staffSt = snapshot.val().st;
            // console.log(staffSt);
          }
          else {
            alert("Staff data Not found in rtdb!")
          }
        })
          .catch((error) => {
            alert(" Unsuccessful, error " + error);
          })
        if (staffSt == "free") {
          playNewchatReqSound();
          update(ref(db, "chats/" + chatKey), {
            st: "active",
            sid: auth.currentUser.uid,
            ptm: new Date().toLocaleString()
          })
            .then(() => {
              chatMessages.innerHTML = "";
              console.log('Chat aceepted successfully.');
              currentChatKey = chatKey;
              // event listiner for new messeges
              onChildAdded(ref(db, 'chats/' + currentChatKey + '/messages'), (messageSnapshot) => {
                const newMessage = messageSnapshot.val();
                displayMessages(newMessage);
              });
            })
            .catch((error) => {
              console.error('Error updating chat:', error);
            });

          update(ref(db, "operators/" + staffUid), {
            st: "active",
            cid: chatKey
          }).then(async () => {
            console.log('Staff st updated successfully.');
            await sendConnectedMsg(currentChatKey);
          })
            .catch((error) => {
              console.error('Error updating staff st:', error);
            });
          console.log(chatKey);
          await get(child(dbref, "chats/" + chatKey)).then((snapshot) => {
            if (snapshot.exists()) {
              let customerName = document.getElementById('customerName');
              customerName.textContent = `You are connected to: ${snapshot.val().cnm}`
              const cid = {
                cid: 20
              }
              // calling cf to fetch customer M/C data
              customerMcDetails(cid);
            }
            else {
              alert("No data found!")
            }
          })

        }
        else {
          chatWarning();
          let warningMSg = 'You are alredy in chat! End the current chat to connect others.';
          var modalElement = document.createElement('div');
          modalElement.className = 'custom-modal';
          modalElement.innerHTML = '<div class="modal-dialog"><div class="modal-content"><div class="modal-body">' + warningMSg + '</div></div></div>';
          document.body.appendChild(modalElement);
          setTimeout(function () {
            modalElement.remove();
          }, 3000);

          // alert("You are alredy in chat! End the current chat to connect others.");

        }
      })
    }
  });
});
const sendConnectedMsg = async (currentChatKey) => {
  const mesgRef = await ref(db, `chats/${currentChatKey}/messages`);
  const msgRef = await push(mesgRef);
  await set(msgRef, {
    nm: staffName,
    msg: 'Thank you for waiting, Now you are connected!.',
    tm: new Date().toLocaleString(),
    rl:'op'
  })
    .then(() => {
      console.log('welcm msg pushed successfully.');
    })
    .catch((error) => {
      console.error('Error welcm msg push :', error);
    });
}

// load old messege data to the operator
let loadOldMsg = async (sUid) => {
  console.log(sUid);
  const dbref = ref(db);
  let staffStatus = ""
  let chatId;
  await get(child(dbref, "operators/" + sUid)).then(async (snapshot) => {
    if (snapshot.exists()) {
      staffStatus = snapshot.val().st;
      chatId = snapshot.val().cid;
      console.log(staffStatus, chatId);
      currentChatKey = chatId;
      console.log("this is current chat id:", currentChatKey);
      onChildAdded(ref(db, 'chats/' + currentChatKey + '/messages'), (messageSnapshot) => {
        const newMessage = messageSnapshot.val();
        displayMessages(newMessage);
      });
    }
    else {
      console.log("No data found!")
    }
  })
    .catch((error) => {
      alert(" Unsuccessful, error " + error);
    })

  if (staffStatus == 'active') {
    //load all existing messege here
    await get(child(dbref, "chats/" + chatId)).then((snapshot) => {
      if (snapshot.exists()) {
        let customerName = document.getElementById('customerName');
        customerName.textContent = `You are connected to: ${snapshot.val().cnm}`
        const cid = {
          cid: 20
        }
        customerMcDetails(cid)
      }
      else {
        alert("No data found!")
      }
    })
  }
}


// insert new messeges to rtdb
let msgForm = document.getElementById('inputMessege');
msgForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const imgFile = uploadImg.files[0];
  let newMsg = document.getElementById('message').value
  const dbref = ref(db);
  let staffSt;

  await get(child(dbref, "operators/" + staffUid)).then((snapshot) => {
    if (snapshot.exists()) {
      staffSt = snapshot.val().st;
    }
    else {
      console.log("No data found!")
    }
  })
    .catch((error) => {
      alert(" Unsuccessful, error " + error);
    })
  if (staffSt == "active") {
    // insert new messeges to rtdb
    const mesgRef = await ref(db, `chats/${currentChatKey}/messages`);
    const msgRef = await push(mesgRef);
    if (imgFile) {     // Upload the file to storage and get the download URL
      const storageRef = sRef(storage);
      const fileRef = sRef(
        storageRef, `sunsynk-chatapp/${currentChatKey}/${imgFile.name}`
      );
      const path_ref = sRef(fileRef, imgFile.name);
      console.log(path_ref, fileRef);
      let upload_data = uploadBytes(fileRef, imgFile).then((snapshot) => {
        console.log("file Uploaded!");
      });

      let downloadURL;
      upload_data.then(() => {
        getDownloadURL(fileRef).then((url) => {
          downloadURL = url;
          set(msgRef, {
            nm: staffName,
            msg: newMsg,
            img: downloadURL,
            tm: new Date().toLocaleString(),
            rl: 'op',
          })
            .then(() => {
              console.log('staff msg with img pushed successfully.');
            })
            .catch((error) => {
              console.error('Error msg push :', error);
            });
        });
      });
    }
    else {
      await set(msgRef, {
        nm: staffName,
        msg: newMsg,
        tm: new Date().toLocaleString(),
        rl: 'op',
      })
        .then(() => {
          console.log("new msg inserted to this chat key: ", currentChatKey);
        })
        .catch((error) => {
          console.error('Error msg push :', error);
        });

    }
    msgForm.reset();
    imagePreview.src = "";
    imagePreview.style.display = "none";
  }
  else {
    alert("Please connect to customer!");
  }
  closeImgPreview.style.display = 'none';
});

const logoutBtn = document.getElementById("log-out");
logoutBtn.addEventListener("click", (e) => {
  signOut(auth)
    .then(function () {
      console.log("User signed out successfully.");
      window.location.href = "../login.html";
    })
    .catch(function (error) {
      console.log("Error signing out:", error);
    });
});

// chat end
let endChatFun = async (confirmation) => {
  if (confirmation) {
    console.log("chat is ended.");
    const dbref = ref(db);
    let currentChatKey;
    await get(child(dbref, "operators/" + staffUid)).then((snapshot) => {
      if (snapshot.exists()) {
        currentChatKey = snapshot.val().cid;
      }
      else {
        alert("No data found!")
      }
    })
      .catch((error) => {
        alert(" Unsuccessful, error " + error);
      })

    update(ref(db, "operators/" + staffUid), {
      st: "free",
      cid: ""
    })
      .then(async () => {
        console.log('Staff st is updated successfully.');
        document.getElementById('customerName').innerHTML = 'You are not connected to any customer.';
        let msn = document.getElementById('msn');
        let pnm = document.getElementById('pnm');
        let idt = document.getElementById('idt');
        msn.parentNode.removeChild(msn);
        pnm.parentNode.removeChild(pnm);
        idt.parentNode.removeChild(idt);
        playchatEndSound();
        const dbref = ref(db);
        let chatData;
        await get(child(dbref, "chats/" + currentChatKey)).then((snapshot) => {
          if (snapshot.exists()) {
            chatData = snapshot.val();
          }
          else {
            alert("No data found!")
          }
        })
        const chatEntireData = {
          chatId: currentChatKey,
          chatData: chatData
        }
        setTimeout(()=>{
          insertChatIntoSql(chatEntireData), 10000
        });
      })
      .catch((error) => {
        console.error('Error updating staff st:', error);
      });

    // chnage the chatkey status to finished; 
    console.log("current chat key: ", currentChatKey);
    update(ref(db, "chats/" + currentChatKey), {
      st: "close",
      etm: new Date().toLocaleString(),
    })
      .then(async () => {
        const mesgRef = await ref(db, `chats/${currentChatKey}/messages`);
        const msgRef = await push(mesgRef);
        await set(msgRef, {
          nm: staffName,
          msg: 'Chat has been end by operator! Thank you for contacting us. Have a great day and take care!',
          tm: new Date().toLocaleString(),
          rl:'op'
        })
          .then(() => {
            chatMessages.innerHTML = "";
            console.log('last msg pushed successfully.');
          })
          .catch((error) => {
            console.error('Error last msg push :', error);
          });
        console.log('Chat st as finished updated successfully.');

      })
      .catch((error) => {
        console.error('Error updating chat:', error);
      });

  }
  else {
    console.log("chat is not ended.");
  }
}

document.getElementById('endChat-btn').addEventListener('click', async () => {
  chatWarning();
  console.log(staffUid);
  const dbref = ref(db);
  let staffSt;
  await get(child(dbref, "operators/" + staffUid)).then((snapshot) => {
    if (snapshot.exists()) {
      staffSt = snapshot.val().st;
    }
    else {
      alert("No data found!")
    }
  })
    .catch((error) => {
      alert(" Unsuccessful, error " + error);
    })

  if (staffSt == "active") {
    let confirmation = confirm('Are you sure you want to end the chat?');
    endChatFun(confirmation);
  }
  else {
    alert("You are not connected to end the chat!");
  }

})

//priview upload img
const closeImgPreview = document.getElementById('closeImgPreview');
uploadImg.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      imagePreview.src = reader.result;
      imagePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
    closeImgPreview.style.display = 'block'
  } else {
    imagePreview.src = "#";
    imagePreview.style.display = "none";
  }
});
//close the img preview
closeImgPreview.addEventListener('click', () => {
  // file input
  uploadImg.value = '';
  imagePreview.src = "#";
  imagePreview.style.display = "none";
  closeImgPreview.style.display = 'none';
})



// add new quick chat
let addSuggestionBtn = document.getElementById('addSuggestionBtn');
addSuggestionBtn.addEventListener('click', function () {
  const formContainer = document.createElement('div');
  formContainer.classList.add('addQuick-msg-container');

  const form = document.createElement('form');
  form.classList.add('quickMsg-form');
  form.id = 'quickMsgFrom'

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Enter your quick chat message...';
  textarea.classList.add('quickMsg-textarea');
  textarea.required = true;

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.innerText = 'Submit';
  submitBtn.classList.add('quickMsg-submit-btn');

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.innerText = 'Cancel';
  cancelBtn.classList.add('quickMsg-cancel-btn');

  form.appendChild(textarea);
  form.appendChild(submitBtn);
  form.appendChild(cancelBtn);

  formContainer.appendChild(form);

  document.body.appendChild(formContainer);

  quickMsgFrom.addEventListener('submit', (e) => {
    e.preventDefault();
    addQuickMsgToDb(textarea.value)
  })
  cancelBtn.addEventListener('click', function () {
    document.body.removeChild(formContainer);
  });

});
const addQuickMsgToDb = async (quickMsg) => {
  const quickMsgsRef = await ref(db, `quickMsgs`);
  const newQkMsgRef = await push(quickMsgsRef);
  set(newQkMsgRef, {
    msg: quickMsg
  })
    .then(() => {
      console.log('New qucik msg added successfully.');
      loadQuickChatMsgs()
      showSuccessMessage();
    })
    .catch((error) => {
      console.error('Error qucik msg :', error);
    });
  let formContainer = document.getElementsByClassName('addQuick-msg-container')[0]
  document.body.removeChild(formContainer);
}
function showSuccessMessage() {
  const successMessage = document.createElement('div');
  successMessage.innerText = 'New Qucik chat added successfully';
  successMessage.classList.add('quickChat-success-message');

  document.body.appendChild(successMessage);

  setTimeout(function () {
    document.body.removeChild(successMessage);
  }, 3000); // Remove the success message after 3 seconds
}

let suggestionList = document.getElementById('suggestionList');
const loadQuickChatMsgs = () => {
  suggestionList.innerHTML = '';
  get(ref(db, `quickMsgs`))
    .then((snapshot) => {
      const messages = snapshot.val();
      for (const msgId in messages) {
        const message = messages[msgId];
        displayQucikChats(message.msg, msgId)
      }
    })
    .catch((error) => {
      console.log("Error while loading quick chat messages!", error);
    });
}

let displayQucikChats = (quickChat, msgId) => {
  let newQuickChatLi = document.createElement('li');
  newQuickChatLi.classList.add('newQuickChatLi');
  const qucikChatContant = document.createElement('div');
  qucikChatContant.classList.add('quickChat-contant');
  qucikChatContant.textContent = quickChat;

  const delQuickChat = document.createElement('div');
  delQuickChat.classList.add('delQuickChat');
  delQuickChat.innerHTML = `<i class="fa-regular fa-trash-can"></i>`;

  qucikChatContant.addEventListener('click', () => {
    const input = document.getElementById('message');
    const currentValue = input.value;
    const cursorPosition = input.selectionStart;
    const newValue = currentValue.slice(0, cursorPosition) + ' ' + quickChat + ' ' + currentValue.slice(cursorPosition);
    input.value = newValue;
    const newCursorPosition = cursorPosition + quickChat.length + 2;
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    input.focus();
  })
  delQuickChat.addEventListener('click', async () => {
    console.log(msgId);
    let confirmation = confirm('Are you sure you want to delete this quick chat?');
    if (confirmation) {
      const quickMsgsRef = await ref(db, `quickMsgs/${msgId}`);
      remove(quickMsgsRef)
        .then(() => {
          console.log('Quick chat msg deleted successfully.');
          loadQuickChatMsgs();
        })
        .catch((error) => {
          console.error('Error deleting Quick chat msg :', error);
        });
    }
  })
  newQuickChatLi.appendChild(qucikChatContant);
  newQuickChatLi.appendChild(delQuickChat);
  suggestionList.appendChild(newQuickChatLi);

}


// insert chat into sql
const insertChatIntoSql = (chat) => {
  const insertChatIntoSql = httpsCallable(functions, 'insertChatIntoSql');
  insertChatIntoSql(chat).then(result => {
    console.log('called cf to insert chat messages', result);
  })
}


