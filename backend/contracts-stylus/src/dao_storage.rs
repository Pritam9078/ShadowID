use alloc::string::String;
use alloc::vec::Vec;
use stylus_sdk::prelude::*;

/// Simple storage for DAO contract
#[derive(Clone)]
pub struct DAOStorage {
    pub member_count: u32,
    pub proposal_count: u32,
    pub members: Vec<String>, // Address strings
    pub proposals: Vec<Proposal>,
}

#[derive(Clone)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub votes_for: u32,
    pub votes_against: u32,
    pub active: bool,
}

impl Default for DAOStorage {
    fn default() -> Self {
        Self {
            member_count: 0,
            proposal_count: 0,
            members: Vec::new(),
            proposals: Vec::new(),
        }
    }
}

impl DAOStorage {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add_member(&mut self, address: String) -> Result<u32, String> {
        if self.members.contains(&address) {
            return Err("Member already exists".to_string());
        }
        
        self.members.push(address);
        self.member_count += 1;
        Ok(self.member_count)
    }

    pub fn is_member(&self, address: &str) -> bool {
        self.members.iter().any(|member| member == address)
    }

    pub fn create_proposal(&mut self, title: String, description: String) -> u32 {
        let proposal = Proposal {
            id: self.proposal_count,
            title,
            description,
            votes_for: 0,
            votes_against: 0,
            active: true,
        };
        
        self.proposals.push(proposal);
        self.proposal_count += 1;
        self.proposal_count - 1
    }

    pub fn vote(&mut self, proposal_id: u32, vote_for: bool) -> Result<(), String> {
        if let Some(proposal) = self.proposals.iter_mut().find(|p| p.id == proposal_id) {
            if !proposal.active {
                return Err("Proposal is not active".to_string());
            }
            
            if vote_for {
                proposal.votes_for += 1;
            } else {
                proposal.votes_against += 1;
            }
            Ok(())
        } else {
            Err("Proposal not found".to_string())
        }
    }

    pub fn get_proposal(&self, proposal_id: u32) -> Option<&Proposal> {
        self.proposals.iter().find(|p| p.id == proposal_id)
    }

    pub fn get_member_count(&self) -> u32 {
        self.member_count
    }

    pub fn get_proposal_count(&self) -> u32 {
        self.proposal_count
    }
}