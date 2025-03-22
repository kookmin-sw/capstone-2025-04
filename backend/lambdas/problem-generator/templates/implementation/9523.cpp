// BOJ - 9523 Arithmetic with Morse

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n; cin >> n;
    queue<ll> q; ll ans = 0;
    loop(i, 1, 2 * n + 1) {
        string ss; cin >> ss;
        if(ss == "+") {
            ll t = q.front(); q.pop();
            while(!q.empty()) { t *= q.front(); q.pop(); }
            ans += t;
        }
        else if(ss == "*");
        else {
            ll t = 0;
            for(char c : ss) {
                if(c == '-') t += 5;
                else if(c == '.') t += 1;
                else if(c == '=') t += 10;
                else if(c == ':') t += 2;
            }
            q.push(t);
        }
    }

    ll t = q.front(); q.pop();
    while(!q.empty()) { t *= q.front(); q.pop(); }
    ans += t;

    cout << ans << '\n';
}