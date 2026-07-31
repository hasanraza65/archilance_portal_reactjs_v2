import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import ContactList from "./components/ContactList";
import MessageThread from "./components/MessageThread";
import { useChatContacts } from "./useChatData";
import { useIsDesktop } from "@/hooks/useMediaQuery";

const ChatPage = () => {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useChatContacts();
  const isDesktop = useIsDesktop();

  const activeContact = contacts.find((c) => String(c.id) === String(contactId));
  const showThread = isDesktop || Boolean(contactId);
  const showList = isDesktop || !contactId;

  return (
    // Height had to account for the mobile tab bar as well as the topbar —
    // it didn't, so the composer sat ~64px below the fold and you had to
    // scroll to find the message box. `dvh` (not `vh`) so a phone browser's
    // collapsing URL bar doesn't push it off again.
    <div className="h-[calc(100dvh-3.5rem-4rem)] lg:h-[calc(100dvh-4rem)] flex overflow-hidden">
      {showList && (
        <div className="w-full lg:w-80 flex-none min-h-0">
          <ContactList contacts={contacts} isLoading={isLoading} activeId={contactId} />
        </div>
      )}
      {showThread && (
        <div className="flex-1 min-w-0 min-h-0">
          <MessageThread contact={activeContact} onBack={() => navigate("/chat")} />
        </div>
      )}
    </div>
  );
};

export default ChatPage;
