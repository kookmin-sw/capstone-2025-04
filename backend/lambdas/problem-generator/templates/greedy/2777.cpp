// BOJ - 2777 숫자 놀이

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
void tc() {
    ll n; cin >> n;
    stack<ll> stk;
    if(n == 1) stk.push(1);
    while(n != 1) {
        for(ll i = 9; i >= 2; i--)
            if(n % i == 0) {
                n /= i;
                stk.push(i);
                goto end;
            }
        cout << "-1\n"; return;
        end:;
    }
    // while(!stk.empty()) {
    //     cout << stk.top(); stk.pop();
    // }
    // cout << '\n';
    cout << stk.size() << '\n';
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    int t; cin >> t;
    while(t--) {
        tc();
    }
}