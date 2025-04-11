// BOJ- 9309 Password Validation

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
ll isRange(ll a, ll x, ll b) {
    return a <= x && x <= b;
}
ll lc(string ss) {
    ll cnt = 0;
    for(char c : ss)
        if(isRange('a', c, 'z')) cnt++;
    return cnt;
}
ll uc(string ss) {
    ll cnt = 0;
    for(char c : ss)
        if(isRange('A', c, 'Z')) cnt++;
    return cnt;
}
ll nc(string ss) {
    ll cnt = 0;
    for(char c : ss) 
        if(isRange('0', c, '9')) cnt++;
    return cnt;
}
ll nac(string ss) {
    string cmp = "!@#$%^&*.,;/?";
    ll cnt = 0;
    for(char c : ss)
        if(cmp.find(c) != cmp.npos) cnt++;
    return cnt;
}
ll consecutive(string ss) {
    ll cnt = 1, maxc = 1, c = ss[0];
    loop(i, 1, ss.size() - 1) {
        if(ss[i] == c) cnt++;
        else {
            maxc = max(maxc, cnt);
            cnt = 1, c = ss[i];
        }
    }
    return maxc;
}
ll palin(string ss) {
    string nss;
    for(char c : ss) {
        if(isRange('A', c, 'Z')) nss.push_back('a' + c - 'A');
        else if(isRange('a', c, 'z')) nss.push_back(c);
        else if(isRange('0', c, '9')) nss.push_back(c);
    }

    loop(i, 0, nss.size() - 1)
        if(nss[i] != nss[nss.size() - 1 - i]) return 0;
    return 1;
}
ll chk(string ss, string cmp) {
    ll idx = 0;
    for(char c : ss) {
        if(c == cmp[idx]) idx++;
        if(isRange('A', c, 'Z') && ('a' + c - 'A' == cmp[idx])) idx++;
        if(idx == cmp.size()) return 1;
    }
    return 0;
}
int tc() {
    string ss; cin >> ss;
    if(!isRange(9, ss.length(), 20)) return 0;
    if(lc(ss) < 2) return 0;
    if(uc(ss) < 2) return 0;
    if(nc(ss) == 0) return 0;
    if(nac(ss) < 2) return 0;
    if(consecutive(ss) >= 3) return 0;
    if(palin(ss)) return 0;
    if(chk(ss, "password")) return 0;
    if(chk(ss, "drowssap")) return 0;
    if(chk(ss, "virginia")) return 0;
    if(chk(ss, "ainigriv")) return 0;
    if(chk(ss, "cavalier")) return 0;
    if(chk(ss, "reilavac")) return 0;
    if(chk(ss, "code")) return 0;
    if(chk(ss, "edoc")) return 0;
    return 1;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll t; cin >> t;
    while(t--) {
        if(tc()) cout << "Valid Password\n";
        else cout << "Invalid Password\n";
    }
}